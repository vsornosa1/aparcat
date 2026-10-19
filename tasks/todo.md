# Tareas: Parkflow Valencia

Plan completo en [plan.md](./plan.md). Cada tarea deja el repositorio en un estado que compila y pasa pruebas.

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
- [ ] `availability()` devuelve `null` para garajes sin dato (`plazaslibr < 0` o `plazastota <= 0`) y calcula la disponibilidad ORA como `1 - ocupacionPct / 100`.
- [ ] `freshness()` clasifica cada señal en `live`, `recent`, `stale` o `unknown` con los umbrales del plan.
- [ ] `rankCandidates()` aplica la fórmula del plan, ordena de forma determinista y nunca pone primero un candidato sin disponibilidad.
- [ ] Cada resultado incluye `score`, `confidence`, `freshness`, `observedAt` y una razón legible.
- [ ] Cobertura de `src/domain` ≥ 90 %.

**Verificación:**
- [ ] `npm run test -- src/domain` con casos de frontera (0 min, 5 min, 15 min, 6 h, valores nulos).
- [ ] `npm run test -- --coverage` comprueba el umbral del dominio.

**Dependencias:** Tarea 2.
**Archivos:** `src/domain/availability.ts`, `src/domain/freshness.ts`, `src/domain/ranking.ts`, `src/domain/geo.ts`, `src/domain/types.ts` y sus `*.test.ts`.
**Alcance:** Medium.

---

## Tarea 5: Ingesta de garajes públicos en vivo

**Descripción:** worker que descarga la capa 194, valida, normaliza y hace upsert de los garajes con su frescura real, registrando cada ejecución en `ingest_runs`.

**Criterios de aceptación:**
- [ ] Una ejecución deja 23 garajes; 7 con dato fresco, 3 obsoletos y 13 `unknown`, tal como los devuelve el Ayuntamiento.
- [ ] `-1` y `-2` se convierten en `null`, nunca en 0 plazas libres.
- [ ] La ocupación se deriva de `plazaslibr / plazastota`; el campo `ocupacion` de origen no se usa como verdad.
- [ ] Si la consulta falla, se conserva el dato anterior y `ingest_runs` lo registra como `failed` o `partial`.
- [ ] El scheduler ejecuta cada minuto para garajes y cierra de forma ordenada ante SIGTERM.

**Verificación:**
- [ ] `npm run ingest` contra la fuente real y consulta SQL de comprobación.
- [ ] `npm run test:integration` con la fixture guardada; sin red en las pruebas.
- [ ] Simular un `500` de la fuente y comprobar que no se borra nada.

**Dependencias:** Tareas 3, 4.
**Archivos:** `src/ingest/sources/valencia.ts`, `src/ingest/upsert.ts`, `src/ingest/run.ts`, `src/ingest/scheduler.ts`, `tests/integration/ingest-facilities.test.ts`.
**Alcance:** Medium.

---

## Tarea 6: Ingesta de tramos ORA y predicciones

**Descripción:** descargar las capas 205, 254, 253, 252 y 4, guardar los tramos con nombre y geometría y actualizar los cuatro horizontes de ocupación por tramo.

**Criterios de aceptación:**
- [ ] Se cargan 257 tramos con nombre de vía y geometría válida (EPSG:4326).
- [ ] Cada tramo tiene los horizontes 1, 6, 12 y 24 horas; los valores repetidos se actualizan, no se duplican.
- [ ] El inventario ORA de la capa 205 se guarda como contexto y no se mezcla con las predicciones.
- [ ] Los tramos con nombre vacío se descartan y quedan contados en el resumen de la ingesta.
- [ ] Un fallo en una capa no impide actualizar las demás.

**Verificación:**
- [ ] `npm run ingest` y consulta de recuento por horizonte.
- [ ] `npm run test:integration` con fixtures de las cinco capas.
- [ ] `ST_IsValid` sobre todas las geometrías cargadas.

**Dependencias:** Tareas 3, 4.
**Archivos:** `src/ingest/sources/valencia.ts`, `src/ingest/upsert.ts`, `src/ingest/run.ts`, `tests/integration/ingest-segments.test.ts`.
**Alcance:** Medium.

---

## Checkpoint B

- [ ] Un ciclo de ingesta deja garajes, tramos y cuatro horizontes en la base de datos.
- [ ] Los fallos parciales no borran datos anteriores.
- [ ] Cobertura del dominio ≥ 90 %.
- [ ] Revisión humana antes de seguir.

---

## Tarea 7: API de recomendaciones cercanas

**Descripción:** endpoint que, dada una posición, devuelve las mejores opciones combinando garajes, tramos y reportes, con distancia a pie, disponibilidad, frescura, confianza y atribución.

**Criterios de aceptación:**
- [ ] `GET /api/parking/nearby?lat&lng&radius` responde con `candidates` ordenados y `meta` (radio, origen, hora de cálculo).
- [ ] Cada candidato incluye `kind` (`garage` | `street`), nombre, distancia en metros, disponibilidad o `null`, `freshness`, `confidence`, `observedAt` y `reason`.
- [ ] Ningún candidato sin disponibilidad encabeza la lista; aparecen como alternativas «sin datos».
- [ ] La consulta usa PostGIS con índice GIST y responde en menos de 300 ms con 500 candidatos en base de datos.
- [ ] Entrada y salida validadas con Zod; errores con formato `{ error: { code, message } }`.
- [ ] `GET /api/parking/map?bbox=` devuelve solo lo necesario para pintar el mapa.

**Verificación:**
- [ ] `npm run test:integration` siembra la base de datos y comprueba el orden esperado.
- [ ] Prueba de contrato que falla si desaparece `observedAt` o `attribution`.
- [ ] Medición de la consulta con `EXPLAIN ANALYZE` documentada en el PR.

**Dependencias:** Tareas 4, 5, 6.
**Archivos:** `src/app/api/parking/nearby/route.ts`, `src/app/api/parking/map/route.ts`, `src/db/queries/nearby.ts`, `tests/integration/nearby.test.ts`.
**Alcance:** Medium.

---

## Tarea 8: Mapa y elección de origen

**Descripción:** pantalla principal con MapLibre que muestra ORA, garajes y reportes vigentes, pide la ubicación solo cuando el usuario lo pide y permite elegir origen manualmente.

**Criterios de aceptación:**
- [ ] Al cargar la página no se solicita la ubicación; solo al pulsar «Aparcar cerca de mí».
- [ ] Si se deniega el permiso, se puede tocar el mapa o buscar una calle y la app sigue funcionando.
- [ ] El mapa pinta zonas ORA, garajes con su estado y reportes vigentes con leyenda textual, no solo por color.
- [ ] La atribución CC BY 4.0 del Ayuntamiento y OpenStreetMap es visible sin abrir un menú.
- [ ] El estilo del mapa se configura por variable de entorno y en desarrollo usa OpenStreetMap.

**Verificación:**
- [ ] `npm run test:e2e` con ubicación simulada y permiso denegado.
- [ ] Revisión con teclado y lector de pantalla de los controles principales.
- [ ] Lighthouse móvil ≥ 95 en accesibilidad.

**Dependencias:** Tarea 7.
**Archivos:** `src/app/page.tsx`, `src/components/map/ParkingMap.tsx`, `src/components/map/MapLegend.tsx`, `src/components/parking/OriginPicker.tsx`, `src/lib/map-style.ts`.
**Alcance:** Medium.

---

## Tarea 9: Hoja de recomendación con frescura y confianza

**Descripción:** hoja inferior con las tres mejores opciones, su antigüedad, su confianza, el motivo de la recomendación y un enlace para navegar hasta el sitio.

**Criterios de aceptación:**
- [ ] Desde la apertura, el usuario llega a una recomendación en dos toques.
- [ ] Cada tarjeta muestra disponibilidad o «sin datos», distancia a pie, frescura y confianza con lenguaje no absoluto.
- [ ] El botón «Cómo llegar» abre la app de mapas del dispositivo con la coordenada destino.
- [ ] Existen estados de carga, vacío, error y zona sin cobertura de datos.
- [ ] El aviso «predicción orientativa, no reserva» es visible sin desplazarse.
- [ ] Responsive de 360 px a escritorio.

**Verificación:**
- [ ] `npm run test:e2e` recorre el flujo completo con APIs simuladas.
- [ ] Revisión visual en móvil y escritorio.
- [ ] Comprobar que ningún texto promete una plaza garantizada.

**Dependencias:** Tarea 8.
**Archivos:** `src/components/parking/RecommendationSheet.tsx`, `src/components/parking/AvailabilityBadge.tsx`, `src/components/parking/FreshnessLabel.tsx`, `tests/e2e/recommendation.spec.ts`.
**Alcance:** Medium.

---

## Tarea 10: Reportes anónimos de la comunidad

**Descripción:** permitir que un usuario marque «he dejado un hueco» o «zona llena»; el reporte aparece al instante, caduca a los 15 minutos y no requiere cuenta.

**Criterios de aceptación:**
- [ ] `POST /api/reports` valida la entrada con Zod y guarda coordenada redondeada a 10 m, tipo y caducidad.
- [ ] El reporte se ve en el mapa en menos de 5 segundos y desaparece al caducar.
- [ ] Límite de reportes por dispositivo e IP; se guarda solo un hash con sal del identificador anónimo.
- [ ] La disponibilidad de los candidatos cercanos refleja el reporte en la siguiente consulta.
- [ ] Un trabajo de limpieza borra reportes caducados y los datos con más de 30 días.

**Verificación:**
- [ ] `npm run test:integration` comprueba creación, expiración y límite de frecuencia.
- [ ] `npm run test:e2e` crea un reporte y lo ve reflejado.
- [ ] Comprobar que no se persiste ningún dato personal en la base de datos.

**Dependencias:** Tareas 7, 9.
**Archivos:** `src/app/api/reports/route.ts`, `src/lib/device-token.ts`, `src/lib/rate-limit.ts`, `src/components/reports/ReportButton.tsx`, `tests/integration/reports.test.ts`.
**Alcance:** Medium.

---

## Checkpoint C

- [ ] Dos toques desde la apertura hasta una recomendación con frescura visible.
- [ ] Un reporte aparece en el mapa en menos de 5 segundos y caduca a los 15 minutos.
- [ ] Sin ubicación se puede elegir origen manualmente.
- [ ] Revisión humana antes de seguir.

---

## Tarea 11: Legalidad, privacidad, atribución y retención

**Descripción:** páginas de aviso legal y privacidad, atribución correcta de los datos y política de retención explícita.

**Criterios de aceptación:**
- [ ] Página de privacidad que explica la geolocalización bajo demanda, el token anónimo y la retención de reportes.
- [ ] Aviso de que la app no pertenece al Ayuntamiento de València y de que las señales de tráfico prevalecen.
- [ ] Atribución «Datos: Ajuntament de València (CC BY 4.0)» enlazada donde se muestran datos municipales.
- [ ] Aviso explícito de que no se usan imágenes de cámaras de tráfico.
- [ ] Un trabajo elimina reportes caducados y datos con más de 30 días, y queda registrado.

**Verificación:**
- [ ] Revisión de las páginas en móvil.
- [ ] Ejecutar el trabajo de retención sobre datos sembrados y comprobar el borrado.

**Dependencias:** Tareas 9, 10.
**Archivos:** `src/app/privacidad/page.tsx`, `src/app/aviso-legal/page.tsx`, `src/components/Attribution.tsx`, `src/ingest/retention.ts`.
**Alcance:** Small.

---

## Tarea 12: Stack dockerizado con un solo comando

**Descripción:** imágenes de web e ingesta, Compose con base de datos, migración, web e ingesta, healthchecks y guía de arranque.

**Criterios de aceptación:**
- [ ] En un clon limpio, `docker compose up` deja la app sirviendo en el puerto documentado y la ingesta corriendo.
- [ ] La migración se ejecuta una vez antes de arrancar web e ingesta.
- [ ] Los contenedores tienen healthcheck y se reinician si fallan.
- [ ] `docker compose down && docker compose up` conserva los datos.
- [ ] El README explica requisitos, variables, arranque y comprobación de salud.

**Verificación:**
- [ ] Ejecutar el ciclo completo en una máquina limpia o con volúmenes borrados.
- [ ] `curl` al endpoint de salud y comprobar la última ingesta.
- [ ] Confirmar que no se copian secretos ni `node_modules` dentro de las imágenes.

**Dependencias:** Tareas 7, 9, 10.
**Archivos:** `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `README.md`, `.env.example`.
**Alcance:** Medium.

---

## Tarea 13: CI y pruebas e2e

**Descripción:** integración continua en GitHub Actions con lint, tipos, unidad, integración con Postgres, build y build de Docker, más el humo e2e en un job separado.

**Criterios de aceptación:**
- [ ] Cada pull request ejecuta lint, typecheck, unidad, integración, build y build de Docker.
- [ ] La integración usa un servicio Postgres con PostGIS y fixtures, nunca la red del Ayuntamiento.
- [ ] El job e2e ejecuta Playwright con APIs simuladas y bloquea las peticiones de tiles externas.
- [ ] El pipeline falla si baja la cobertura mínima del dominio.
- [ ] La CI verde es requisito para fusionar.

**Verificación:**
- [ ] Abrir un PR de prueba y comprobar todos los jobs.
- [ ] Romper a propósito una prueba del dominio y ver el pipeline en rojo.

**Dependencias:** Tarea 12.
**Archivos:** `.github/workflows/ci.yml`, `.github/workflows/e2e.yml`, `playwright.config.ts`, `tests/e2e/*`.
**Alcance:** Medium.

---

## Tarea 14: Endurecimiento y lista de lanzamiento

**Descripción:** cerrar los flecos de seguridad, observabilidad y despliegue antes de publicar.

**Criterios de aceptación:**
- [ ] Cabeceras de seguridad y CSP compatibles con el mapa.
- [ ] Límite de frecuencia verificado en todos los endpoints públicos.
- [ ] `/api/health` informa estado de la base de datos y última ejecución por fuente.
- [ ] Logs estructurados con identificador de petición; sin datos personales ni coordenadas exactas.
- [ ] Documentado el despliegue autohospedado y la alternativa Vercel + Neon, con plan de vuelta atrás.
- [ ] Lighthouse móvil ≥ 95 en accesibilidad y ≥ 85 en rendimiento.

**Verificación:**
- [ ] Revisión de seguridad con la lista de comprobación del skill de hardening.
- [ ] Prueba de carga ligera: 20 peticiones concurrentes a `nearby` con p95 < 800 ms en local.
- [ ] Repasar que ninguna variable sensible está en el repositorio.

**Dependencias:** Tarea 13.
**Archivos:** `next.config.ts`, `src/middleware.ts`, `src/app/api/health/route.ts`, `docs/deploy.md`, `src/lib/logger.ts`.
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
