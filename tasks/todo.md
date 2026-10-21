# Tareas: Parkflow Valencia

Plan completo en [plan.md](./plan.md). Cada tarea deja el repositorio en un estado que compila y pasa pruebas.

> **Nota (2026-10-21):** la predicción de calles descrita en las tareas 6, 7 y 8 se retiró en la iteración [«retirada de la predicción de calles»](#iteración-2026-10-21-retirada-de-la-predicción-de-calles). Las tareas antiguas se conservan como registro de lo construido; el estado vigente es el de la última sección.

Comandos previstos: `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:integration`, `npm run test:e2e`, `npm run db:migrate`, `npm run ingest`, `npm run probe:sources`, `docker compose up`.

---

## Tarea 1: Probe reproducible de fuentes municipales

**Descripción:** convertir la investigación ya documentada en un script ejecutable que consulte los endpoints reales, informe recuentos, campos y frescura, y falle con un mensaje claro si un esquema cambia. Es la alarma temprana contra cambios del Ayuntamiento.

**Criterios de aceptación:**
- [x] `npm run probe:sources` consulta las capas 194, 254, 253, 252, 4, 205 y 190 e informa recuento, campos presentes y antigüedad.
- [x] Con los datos del 2026-10-19 informa 23 garajes, 257 tramos de predicción y 680 cámaras.
- [x] Detecta la ausencia de un campo esperado y termina con código de salida distinto de cero.
- [x] `docs/research/valencia-data-sources.md` queda enlazado desde el README.

**Verificación:**
- [x] Ejecutar `npm run probe:sources` y comparar la salida con la documentación.
- [x] Simular un campo ausente en una prueba unitaria del validador y comprobar el fallo.

**Dependencias:** Ninguna.
**Archivos:** `scripts/probe-sources.ts`, `src/ingest/sources/valencia.ts` (esquemas), `src/ingest/sources/valencia.test.ts`, `README.md`.
**Alcance:** Small.

---

## Tarea 2: Andamiaje de la app y puertas de calidad

**Descripción:** crear el proyecto Next.js con TypeScript estricto, Tailwind, ESLint, Prettier, Vitest, validación de entorno con Zod y estructura de carpetas acordada.

**Criterios de aceptación:**
- [x] `npm run dev` sirve una página vacía con la estructura de carpetas del plan.
- [x] `npm run lint`, `npm run typecheck` y `npm run test` pasan en un clon limpio.
- [x] `src/lib/env.ts` valida las variables con Zod y falla con un mensaje útil si falta alguna.
- [x] Hay una prueba unitaria de ejemplo que demuestra que Vitest está bien configurado.
- [x] `.env.example` documenta todas las variables y no hay secretos en el repositorio.

**Verificación:**
- [x] `npm ci && npm run lint && npm run typecheck && npm run test`.
- [x] Borrar una variable obligatoria y comprobar que el arranque falla con mensaje claro.

**Dependencias:** Ninguna.
**Archivos:** `package.json`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/lib/env.ts`, `.env.example`.
**Alcance:** Medium (la mayoría de archivos los genera el andamiaje).

---

## Tarea 3: Base de datos PostGIS con esquema y migraciones

**Descripción:** levantar PostgreSQL con PostGIS en Docker Compose y definir el esquema versionado: garajes, tramos ORA, predicciones, reportes e ingestas, con índices geoespaciales.

**Criterios de aceptación:**
- [x] `docker compose up -d db` arranca PostGIS con healthcheck y volumen persistente.
- [x] `npm run db:migrate` aplica las migraciones desde cero sin errores.
- [x] Existen las tablas `parking_facilities`, `parking_segments`, `occupancy_predictions`, `availability_reports` e `ingest_runs`.
- [x] Los índices GIST están en las columnas de geometría y las predicciones se actualizan por clave `(segment_id, horizon_hours)`.
- [x] Una prueba de integración inserta un punto y una línea y consulta distancia en metros.

**Verificación:**
- [x] `docker compose up -d db && npm run db:migrate && npm run test:integration`.
- [x] Volver a ejecutar las migraciones y confirmar que son idempotentes.

**Dependencias:** Tarea 2.
**Archivos:** `docker-compose.yml`, `src/db/schema.ts`, `src/db/client.ts`, `src/db/migrations/*`, `tests/integration/schema.test.ts`.
**Alcance:** Medium.

---

## Checkpoint A

- [x] El probe confirma las fuentes y la documentación coincide con la realidad.
- [x] `npm run lint`, `npm run typecheck` y `npm run test` pasan en un clon limpio.
- [x] `docker compose up -d db` y las migraciones funcionan desde cero.
- [ ] Revisión humana antes de seguir.

---

## Tarea 4: Reglas de dominio con pruebas

**Descripción:** implementar en TypeScript puro las reglas de disponibilidad, frescura, confianza y ranking, sin dependencias de framework ni base de datos. Es el corazón del producto y lo que hace explicable cada recomendación.

**Criterios de aceptación:**
- [x] `availability()` devuelve `null` para garajes sin dato (`plazaslibr < 0` o `plazastota <= 0`) y calcula la disponibilidad ORA como `1 - ocupacionPct / 100`.
- [x] `freshness()` clasifica cada señal en `live`, `recent`, `stale` o `unknown` con los umbrales del plan.
- [x] `rankCandidates()` aplica la fórmula del plan, ordena de forma determinista y nunca pone primero un candidato sin disponibilidad.
- [x] Cada resultado incluye `score`, `confidence`, `freshness`, `observedAt` y una razón legible.
- [x] Cobertura de `src/domain` ≥ 90 %.

**Verificación:**
- [x] `npm run test -- src/domain` con casos de frontera (0 min, 5 min, 15 min, 6 h, valores nulos).
- [x] `npm run test:coverage` comprueba el umbral del dominio (98,5 % de líneas).

**Dependencias:** Tarea 2.
**Archivos:** `src/domain/availability.ts`, `src/domain/freshness.ts`, `src/domain/ranking.ts`, `src/domain/geo.ts`, `src/domain/types.ts` y sus `*.test.ts`.
**Alcance:** Medium.

---

## Tarea 5: Ingesta de garajes públicos en vivo

**Descripción:** worker que descarga la capa 194, valida, normaliza y hace upsert de los garajes con su frescura real, registrando cada ejecución en `ingest_runs`.

**Criterios de aceptación:**
- [x] Una ejecución deja 23 garajes; 7 con dato fresco, 3 obsoletos y 13 `unknown`, tal como los devuelve el Ayuntamiento.
- [x] `-1` y `-2` se convierten en `null`, nunca en 0 plazas libres.
- [x] La ocupación se deriva de `plazaslibr / plazastota`; el campo `ocupacion` de origen no se usa como verdad.
- [x] Si la consulta falla, se conserva el dato anterior y `ingest_runs` lo registra como `failed` o `partial`.
- [x] El scheduler ejecuta cada minuto para garajes y cierra de forma ordenada ante SIGTERM.

**Verificación:**
- [x] `npm run ingest` contra la fuente real y consulta SQL de comprobación.
- [x] `npm run test:integration` con la fixture guardada; sin red en las pruebas.
- [x] Simular un fallo de la fuente y comprobar que no se borra nada.
- [x] El scheduler arranca y ejecuta el primer ciclo; la parada por SIGTERM se verificará en el contenedor Linux (tarea 12).

**Dependencias:** Tareas 3, 4.
**Archivos:** `src/ingest/sources/valencia.ts`, `src/ingest/upsert.ts`, `src/ingest/run.ts`, `src/ingest/scheduler.ts`, `tests/integration/ingest-facilities.test.ts`.
**Alcance:** Medium.

---

## Tarea 6: Ingesta de tramos ORA y predicciones

**Descripción:** descargar las capas 205, 254, 253, 252 y 4, guardar los tramos con nombre y geometría y actualizar los cuatro horizontes de ocupación por tramo.

**Criterios de aceptación:**
- [x] Se cargan 257 tramos con nombre de vía y geometría válida (EPSG:4326).
- [x] Los 255 tramos con predicción tienen los horizontes 1, 6, 12 y 24 horas (1.020 filas); los 2 con `null` municipal en todos los horizontes no generan predicción. Los valores repetidos se actualizan, no se duplican.
- [x] El inventario ORA de la capa 205 se guarda como contexto y no se mezcla con las predicciones.
- [x] Los tramos con nombre vacío se descartan y quedan contados en el resumen de la ingesta.
- [x] Un fallo en una capa no impide actualizar las demás.

**Verificación:**
- [x] `npm run ingest` y consulta de recuento por horizonte (1.020 predicciones).
- [x] `npm run test:integration` con fixtures de las cinco capas.
- [x] `ST_IsValid` sobre todas las geometrías cargadas.

**Dependencias:** Tareas 3, 4.
**Archivos:** `src/ingest/sources/valencia.ts`, `src/ingest/upsert.ts`, `src/ingest/run.ts`, `tests/integration/ingest-segments.test.ts`.
**Alcance:** Medium.

---

## Checkpoint B

- [x] Un ciclo de ingesta deja garajes, tramos y cuatro horizontes en la base de datos.
- [x] Los fallos parciales no borran datos anteriores.
- [x] Cobertura del dominio ≥ 90 %.
- [ ] Revisión humana antes de seguir.

---

## Tarea 7: API de recomendaciones cercanas

**Descripción:** endpoint que, dada una posición, devuelve las mejores opciones combinando garajes, tramos y reportes, con distancia a pie, disponibilidad, frescura, confianza y atribución.

**Criterios de aceptación:**
- [x] `GET /api/parking/nearby?lat&lng&radius` responde con `candidates` ordenados y `meta` (radio, origen, hora de cálculo).
- [x] Cada candidato incluye `kind` (`garage` | `street`), nombre, distancia en metros, disponibilidad o `null`, `freshness`, `confidence`, `observedAt`, `ageMinutes` y `reason`.
- [x] Ningún candidato sin disponibilidad encabeza la lista; aparecen como alternativas «sin datos».
- [x] La consulta usa PostGIS con índice GIST; con los datos actuales responde en decenas de milisegundos. La prueba de carga con 500 candidatos queda para la tarea 14.
- [x] Entrada y salida validadas con Zod; errores con formato `{ error: { code, message } }`.
- [x] `GET /api/parking/map?bbox=` devuelve solo lo necesario para pintar el mapa.
- [x] `GET /api/streets?q=` permite elegir el origen por nombre de calle.

**Verificación:**
- [x] `npm run test:integration` siembra la base de datos y comprueba el orden esperado y los contadores.
- [x] Prueba de contrato con `nearbyResponseSchema`, que falla si desaparece `observedAt`, `ageMinutes` o `attribution`.
- [x] `EXPLAIN ANALYZE` de las consultas geoespaciales revisado con los datos reales.

**Dependencias:** Tareas 4, 5, 6.
**Archivos:** `src/api/contracts.ts`, `src/api/nearby.ts`, `src/api/map.ts`, `src/api/streets.ts`, `src/app/api/parking/*/route.ts`, `src/app/api/streets/route.ts`, `tests/integration/nearby.test.ts`, `tests/integration/map.test.ts`.
**Alcance:** Medium.

---

## Tarea 8: Mapa y elección de origen

**Descripción:** pantalla principal con MapLibre que muestra ORA, garajes y reportes vigentes, pide la ubicación solo cuando el usuario lo pide y permite elegir origen manualmente.

**Criterios de aceptación:**
- [x] Al cargar la página no se solicita la ubicación; solo al pulsar «Aparcar cerca de mí».
- [x] Si se deniega el permiso, se puede tocar el mapa o buscar una calle y la app sigue funcionando.
- [x] El mapa pinta zonas ORA, garajes con su estado y reportes vigentes con leyenda textual, no solo por color.
- [x] El mapa muestra la ubicación de las cámaras con un enlace al visor oficial; nunca descarga ni publica imágenes.
- [x] La atribución CC BY 4.0 del Ayuntamiento y OpenStreetMap es visible sin abrir un menú.
- [x] El estilo del mapa se configura por `NEXT_PUBLIC_MAP_STYLE_URL`; en desarrollo usa OpenStreetMap con un worker copiado en `postinstall`.

**Verificación:**
- [x] Verificación manual en navegador: mapa, calles, ubicación y permiso denegado.
- [x] Revisión con teclado de los controles principales (botones e input nativos).
- [ ] Test e2e automatizado y Lighthouse: tareas 13 y 14.

**Dependencias:** Tarea 7.
**Archivos:** `src/app/page.tsx`, `src/components/ParkflowApp.tsx`, `src/components/map/ParkingMap.tsx`, `src/components/map/MapLegend.tsx`, `src/components/parking/OriginPicker.tsx`, `scripts/copy-maplibre-worker.mjs`.
**Alcance:** Medium.

---

## Tarea 9: Hoja de recomendación con frescura y confianza

**Descripción:** hoja inferior con las tres mejores opciones, su antigüedad, su confianza, el motivo de la recomendación y un enlace para navegar hasta el sitio.

**Criterios de aceptación:**
- [x] Desde la apertura, el usuario llega a una recomendación en dos toques (elegir calle y ver resultados).
- [x] Cada tarjeta muestra disponibilidad o «sin datos», distancia a pie, frescura y confianza con lenguaje no absoluto.
- [x] El botón «Cómo llegar» abre la app de mapas del dispositivo con la coordenada destino.
- [x] Existen estados de carga, vacío, error y zona sin cobertura de datos.
- [x] El aviso «predicción orientativa, no reserva» es visible sin desplazarse.
- [x] Responsive verificado a 390 px y 1280 px.

**Verificación:**
- [x] Verificación manual del flujo completo con datos reales.
- [x] Revisión visual en móvil y escritorio.
- [x] Ningún texto promete una plaza garantizada.
- [ ] Test e2e automatizado: tarea 13.

**Dependencias:** Tarea 8.
**Archivos:** `src/components/parking/RecommendationSheet.tsx`, `src/components/parking/AvailabilityBadge.tsx`, `src/components/parking/FreshnessLabel.tsx`.
**Alcance:** Medium.

---

## Tarea 10: Reportes anónimos de la comunidad

**Descripción:** permitir que un usuario marque «he dejado un hueco» o «zona llena»; el reporte aparece al instante, caduca a los 15 minutos y no requiere cuenta.

**Criterios de aceptación:**
- [x] `POST /api/reports` valida la entrada con Zod y guarda coordenada redondeada a 10 m, tipo y caducidad de 15 minutos.
- [x] El reporte se ve en la siguiente consulta en menos de 5 segundos (observado ~2,5 s) y desaparece al caducar.
- [x] Límite de reportes por dispositivo e IP; se guarda solo un hash SHA-256 con sal del identificador anónimo.
- [x] La disponibilidad de los candidatos cercanos refleja el reporte en la siguiente consulta.
- [x] Un trabajo de limpieza horario purga los reportes caducados; no se guarda ningún dato con más de 30 días.

**Verificación:**
- [x] `npm run test:integration` comprueba creación, expiración, purga y límite de frecuencia.
- [x] Verificación manual en navegador: dos reportes y refresco del resumen.
- [x] Comprobado que solo se persiste el hash del dispositivo y coordenadas redondeadas.
- [ ] Test e2e automatizado: tarea 13.

**Dependencias:** Tareas 7, 9.
**Archivos:** `src/api/reports.ts`, `src/app/api/reports/route.ts`, `src/lib/device-token.ts`, `src/lib/rate-limit.ts`, `src/ingest/retention.ts`, `src/components/reports/ReportButtons.tsx`, `tests/integration/reports.test.ts`.
**Alcance:** Medium.

---

## Checkpoint C

- [x] Dos toques desde la apertura hasta una recomendación con frescura visible.
- [x] Un reporte aparece en la siguiente consulta en menos de 5 segundos y caduca a los 15 minutos.
- [x] Sin ubicación se puede elegir origen manualmente.
- [ ] Revisión humana antes de seguir.

---

## Tarea 11: Legalidad, privacidad, atribución y retención

**Descripción:** páginas de aviso legal y privacidad, atribución correcta de los datos y política de retención explícita.

**Criterios de aceptación:**
- [x] Página de privacidad que explica la geolocalización bajo demanda, el token anónimo y la retención de reportes.
- [x] Aviso de que la app no pertenece al Ayuntamiento de València y de que las señales de tráfico prevalecen.
- [x] Atribución «Datos: Ajuntament de València (CC BY 4.0)» enlazada donde se muestran datos municipales.
- [x] Aviso explícito de que no se usan imágenes de cámaras de tráfico.
- [x] Un trabajo elimina reportes caducados y datos con más de 30 días, y queda registrado.

**Verificación:**
- [x] Revisión de las páginas legales en escritorio; usan un layout de una columna apto para móvil.
- [x] Pruebas de integración de la purga de reportes y de `ingest_runs` con más de 30 días.

**Dependencias:** Tareas 9, 10.
**Archivos:** `src/app/privacidad/page.tsx`, `src/app/aviso-legal/page.tsx`, `src/lib/legal.ts`, `src/components/parking/RecommendationSheet.tsx`, `src/ingest/retention.ts`.
**Alcance:** Small.

---

## Tarea 12: Stack dockerizado con un solo comando

**Descripción:** imágenes de web e ingesta, Compose con base de datos, migración, web e ingesta, healthchecks y guía de arranque.

**Criterios de aceptación:**
- [x] En un clon limpio, `docker compose up` deja la app sirviendo en el puerto documentado y la ingesta corriendo.
- [x] La migración se ejecuta una vez antes de arrancar web e ingesta.
- [x] Los contenedores tienen healthcheck y se reinician si fallan.
- [x] `docker compose down && docker compose up` conserva los datos.
- [x] El README explica requisitos, variables, arranque y comprobación de salud.

**Verificación:**
- [x] Ciclo completo construido y levantado; web healthy, ingest corriendo y `/api/health` en verde.
- [x] `docker compose down` + `up`: 23 garajes, 679 cámaras y 257 tramos conservados.
- [x] `.dockerignore` excluye `node_modules`, `.next` y los `.env`; las imágenes se construyen sin secretos.

**Dependencias:** Tareas 7, 9, 10.
**Archivos:** `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `README.md`, `docs/deploy.md`, `.env.example`.
**Alcance:** Medium.

---

## Tarea 13: CI y pruebas e2e

**Descripción:** integración continua en GitHub Actions con lint, tipos, unidad, integración con Postgres, build y build de Docker, más el humo e2e en un job separado.

**Criterios de aceptación:**
- [x] Cada pull request ejecuta lint, typecheck, unidad, integración, build y build de Docker.
- [x] La integración usa un servicio Postgres con PostGIS y fixtures, nunca la red del Ayuntamiento.
- [x] El job e2e ejecuta Playwright con APIs simuladas y bloquea las peticiones de tiles externas.
- [x] El pipeline falla si baja la cobertura mínima del dominio.
- [ ] La CI verde es requisito para fusionar (hay que activar la protección de rama al publicar).

**Verificación:**
- [x] E2E ejecutado en local: 2/2 en verde sobre un servidor limpio en el puerto 3100.
- [ ] Abrir un PR y comprobar los jobs en GitHub (pendiente de publicar).
- [ ] Romper una prueba del dominio y ver el pipeline en rojo (se verifica al ejecutar la CI).

**Dependencias:** Tarea 12.
**Archivos:** `.github/workflows/ci.yml`, `playwright.config.ts`, `tests/e2e/smoke.spec.ts`.
**Alcance:** Medium.

---

## Tarea 14: Endurecimiento y lista de lanzamiento

**Descripción:** cerrar los flecos de seguridad, observabilidad y despliegue antes de publicar.

**Criterios de aceptación:**
- [x] Cabeceras de seguridad y CSP compatibles con el mapa.
- [x] Límite de frecuencia verificado en todos los endpoints públicos.
- [x] `/api/health` informa estado de la base de datos y última ejecución por fuente.
- [x] Logs estructurados con identificador de petición; sin datos personales ni coordenadas exactas.
- [x] Documentado el despliegue autohospedado y la alternativa Vercel + Neon, con plan de vuelta atrás.
- [ ] Lighthouse móvil ≥ 95 en accesibilidad y ≥ 85 en rendimiento (pendiente de ejecutar en un navegador real).

**Verificación:**
- [x] Revisión manual de seguridad: cabeceras, CSP, rate limit, hash de dispositivo y ausencia de secretos.
- [x] Carga ligera: 20 peticiones concurrentes a `nearby`, todas 200, p95 ≈ 310 ms.
- [x] `npm audit --omit=dev`: 0 vulnerabilidades en dependencias de producción.
- [ ] Lighthouse (requiere navegador con WebGL y medición real).

**Dependencias:** Tarea 13.
**Archivos:** `next.config.ts`, `src/lib/request-id.ts`, `src/app/api/health/route.ts`, `docs/deploy.md`, `src/lib/logger.ts`.
**Alcance:** Small.

---

## Tarea 15 (vía paralela, no bloquea el MVP): Solicitar y hacer seguimiento de la autorización de cámaras

**Descripción:** presentar formalmente la solicitud de reutilización de imágenes de cámaras descrita en [camera-authorization-request.md](../docs/legal/camera-authorization-request.md), registrar el número de entrada y hacer seguimiento hasta obtener una respuesta.

**Criterios de aceptación:**
- [ ] La solicitud se presenta por la Sede Electrónica o Registre General y se guarda justificante con fecha y número de registro.
- [ ] El anexo técnico incluye la lista de cámaras propuestas, la frecuencia de consulta, la retención y las medidas de seguridad.
- [ ] Se registra la respuesta (o la ausencia de respuesta) en el propio documento de solicitud.
- [ ] Si es afirmativa: se abre una fase nueva con evaluación de impacto y plan técnico, sin mezclarla con el MVP.
- [ ] Si es negativa: se documenta y el MVP continúa igual; no se implementa ningún scraping no autorizado.

**Verificación:**
- [ ] Justificante de presentación archivado.
- [ ] Documento actualizado con la respuesta y la decisión.

**Dependencias:** Ninguna. Se puede hacer en paralelo a la Fase 0.
**Archivos:** `docs/legal/camera-authorization-request.md`.
**Alcance:** Small.

---

## Fase futura (no ahora)

- **Piloto de cámaras con autorización escrita:** plan de experimento, evaluación de impacto de privacidad, anonimización de matrículas y caras, procesado en servidor y publicación solo de ocupación derivada. Se tramita en la Tarea 15.
- **Rutinas y geofencing:** solo si se demuestra demanda y se resuelve el consumo de batería.
- **Cola o reserva virtual:** solo con masa crítica de usuarios y acuerdos con operadores.

---

## Iteración 2026-10-21: retirada de la predicción de calles

Spec aprobado: [simplificar-capas-mapa.md](../docs/spec/simplificar-capas-mapa.md). Objetivo: cuatro capas (Garajes, Reportes, ORA, Cámaras) y ORA solo azul, naranja y verde. Las tablas de predicción se conservan vacías.

### Slice A — ORA de tres colores

#### Tarea 16: Filtrar el amarillo en la API ORA

**Descripción:** excluir `Amarillo` al leer las marcas, igual que ya se hace con `Blanco`, y subir la versión de caché del cliente.

**Criterios de aceptación:**
- [ ] `GET /api/parking/ora` no devuelve ninguna zona `Amarillo` ni `Blanco`.
- [ ] La fila de caché del cliente usa `?v=6`.
- [ ] La prueba de integración siembra una marca amarilla y comprueba que no sale.

**Verificación:** `npm run test:integration` y consulta manual del endpoint contando colores.

**Dependencias:** Ninguna.
**Archivos:** `src/api/ora.ts`, `src/lib/api-client.ts`, `tests/integration/ora.test.ts`, `tests/integration/helpers/nearby-fixtures.ts`.
**Alcance:** Small.

#### Tarea 17: Quitar el amarillo del mapa y la leyenda

**Descripción:** eliminar el color y los textos de la zona amarilla del mapa, del popup y de la leyenda.

**Criterios de aceptación:**
- [ ] `ParkingMap.tsx` no contiene `Amarillo` en la expresión de color ni en las etiquetas del popup.
- [ ] La leyenda muestra solo azul, naranja y verde.
- [ ] El resto de capas sigue igual.

**Verificación:** `npm run typecheck`, `npm run lint` y revisión visual en el navegador.

**Dependencias:** Tarea 16.
**Archivos:** `src/components/map/ParkingMap.tsx`, `src/components/map/MapLegend.tsx`.
**Alcance:** Small.

### Slice B — retirada de la predicción (se implementa y verifica junta)

#### Tarea 18: Limpiar contratos y dominio

**Descripción:** quitar el tipo de candidato `street`, la disponibilidad de calle, la frescura de predicción y la rama de calle del ranking.

**Criterios de aceptación:**
- [ ] `Candidate.kind` solo admite `garage`.
- [ ] No quedan `streetAvailability`, `street_prediction` ni referencias a `horizon`.
- [ ] Las pruebas unitarias del dominio se actualizan y pasan.

**Verificación:** `npm test` y `npm run typecheck` al cerrar el slice.

**Dependencias:** Ninguna.
**Archivos:** `src/api/contracts.ts`, `src/domain/types.ts`, `src/domain/availability.ts`, `src/domain/freshness.ts`, `src/domain/ranking.ts`, `src/domain/*.test.ts`.
**Alcance:** Medium.

#### Tarea 19: Limpiar APIs y búsqueda

**Descripción:** quitar las consultas de tramos y predicciones de `nearby` y `map`, eliminar `includeStreets` y borrar el endpoint local de calles.

**Criterios de aceptación:**
- [ ] `nearby` devuelve solo garajes y su `meta` no incluye `streetSegments`.
- [ ] `map` no incluye `layers.segments` ni `meta.segments`.
- [ ] `/api/streets` responde 404 y `searchStreets` ya no existe.
- [ ] La búsqueda usa solo MapTiler.

**Verificación:** `npm run test:integration` y consulta manual de ambos endpoints.

**Dependencias:** Tarea 18.
**Archivos:** `src/api/nearby.ts`, `src/api/map.ts`, `src/app/api/parking/nearby/route.ts`, `src/lib/api-client.ts`, `src/lib/geocoding.ts`, y borrado de `src/api/streets.ts` + `src/app/api/streets/route.ts`.
**Alcance:** Medium.

#### Tarea 20: Limpiar la UI del mapa y las recomendaciones

**Descripción:** dejar cuatro chips, quitar la fuente y la capa de tramos, el popup de calle y los textos de predicción.

**Criterios de aceptación:**
- [ ] Los chips son exactamente Garajes, Reportes, ORA y Cámaras.
- [ ] El mapa no crea la fuente ni la capa `segments`.
- [ ] Ninguna tarjeta menciona «predicción» ni «calle».
- [ ] La leyenda no tiene la sección de predicción.

**Verificación:** `npm run typecheck`, `npm run lint` y revisión visual en móvil y escritorio.

**Dependencias:** Tareas 18 y 19.
**Archivos:** `src/components/map/layers.ts`, `src/components/map/LayerControls.tsx`, `src/components/map/ParkingMap.tsx`, `src/components/map/MapLegend.tsx`, `src/components/ParkflowApp.tsx`, `src/components/parking/RecommendationSheet.tsx`, `src/components/parking/AvailabilityBadge.tsx`, `src/lib/candidates.ts`.
**Alcance:** Medium.

#### Tarea 21: Retirar la ingesta de predicciones

**Descripción:** dejar solo la ingesta de marcas ORA en `segments.ts`, quitar el job y las capas de predicción del probe.

**Criterios de aceptación:**
- [ ] `npm run ingest` no descarga las capas 254/253/252/4.
- [ ] El scheduler no ejecuta `regulated_parking`.
- [ ] `npm run probe:sources` sigue comprobando garajes, ORA y cámaras.
- [ ] Las tablas `parking_segments` y `occupancy_predictions` siguen existiendo, sin escrituras.

**Verificación:** `npm run ingest` en Docker y `GET /api/health`.

**Dependencias:** Ninguna.
**Archivos:** `src/ingest/segments.ts`, `src/ingest/sources/valencia.ts`, `src/ingest/run.ts`, `src/ingest/scheduler.ts`, `scripts/probe-sources.ts`, `src/ingest/sources/valencia.test.ts`.
**Alcance:** Medium.

### Slice C — pruebas y documentación

#### Tarea 22: Actualizar pruebas de integración y e2e

**Descripción:** ajustar fixtures y casos al contrato sin calles, y añadir la comprobación de los cuatro chips.

**Criterios de aceptación:**
- [ ] Los fixtures ya no siembran tramos ni predicciones.
- [ ] `nearby` y `map` prueban la ausencia de datos de calle.
- [ ] El e2e comprueba los cuatro chips y el toggle de ORA.
- [ ] `npm test`, `npm run test:integration` y `npm run test:e2e` pasan.

**Verificación:** los tres comandos en verde.

**Dependencias:** Tareas 18 a 21.
**Archivos:** `tests/integration/helpers/nearby-fixtures.ts`, `tests/integration/nearby.test.ts`, `tests/integration/map.test.ts`, `tests/integration/ingest-segments.test.ts`, `tests/e2e/smoke.spec.ts`.
**Alcance:** Medium.

#### Tarea 23: Actualizar documentación y verificar Docker

**Descripción:** alinear README, research, plan y tareas con el estado real y cerrar con la pila dockerizada.

**Criterios de aceptación:**
- [ ] README describe tres señales y tres colores ORA, sin predicción de calles.
- [ ] `docs/research/valencia-data-sources.md` marca la predicción como retirada, sin borrar el histórico.
- [ ] `tasks/plan.md` y `tasks/todo.md` reflejan esta iteración.
- [ ] `docker compose --env-file .env.local up -d --build` queda sano y `/api/health` responde 200.

**Verificación:** `npm run build`, `docker compose ps` y `/api/health`.

**Dependencias:** Tareas 20 a 22.
**Archivos:** `README.md`, `docs/research/valencia-data-sources.md`, `tasks/plan.md`, `tasks/todo.md`, `docs/spec/simplificar-capas-mapa.md`.
**Alcance:** Small.
