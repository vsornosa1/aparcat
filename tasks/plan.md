# Plan de implementación: Parkflow Valencia

## Resumen

Webapp pública que responde «¿dónde aparco ahora?» en Valencia. Combina tres señales legales y verificadas: disponibilidad en vivo de los aparcamientos públicos municipales, predicción municipal de ocupación del aparcamiento regulado en la zona centro y reportes anónimos de la comunidad con caducidad de 15 minutos. La interfaz muestra siempre la frescura y la confianza de cada dato y nunca promete una plaza.

El contexto de producto está en [valencia-parking.md](../docs/intent/valencia-parking.md) y las fuentes verificadas en [valencia-data-sources.md](../docs/research/valencia-data-sources.md).

## Decisiones de arquitectura

| Decisión | Elección | Motivo |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript estricto | Un solo desplegable, rutas API y render inicial rápido; ecosistema conocido |
| Estilos | Tailwind CSS | Iteración rápida y consistente sin CSS muerto |
| Mapa | MapLibre GL JS + tiles configurables por entorno | Sin dependencia de un SDK propietario; el proveedor de tiles se decide antes de lanzar |
| Base de datos | PostgreSQL + PostGIS en Docker | Consultas geoespaciales reales (distancias, vecinos, índices GIST) |
| Acceso a datos | Drizzle ORM + SQL crudo para geometría | Tipado y migraciones versionadas sin pelearse con PostGIS |
| Ingesta | Worker Node/TS independiente con scheduler | Aísla la web de los fallos de red del Ayuntamiento y permite escalar aparte |
| Dominio | Módulo TypeScript puro (`src/domain`) | El ranking es testeable sin framework ni base de datos |
| Validación | Zod en todos los límites (fuentes, API, entorno) | Evita que un cambio de esquema municipal rompa la app en silencio |
| Registro | `pino` en JSON | Logs consultables en cualquier plataforma |
| Pruebas | Vitest (unidad e integración) + Playwright (humo e2e) | Cubre dominio, base de datos y flujo real |
| Despliegue | Docker Compose con un solo comando | Cumple el «todo dockerizado»; Vercel + Neon como alternativa documentada |

Estructura de carpetas prevista:

```
src/
  app/                 # rutas y componentes de Next.js
  domain/              # reglas puras: disponibilidad, frescura, ranking
  db/                  # esquema Drizzle, cliente y consultas
  ingest/              # fuentes municipales, upsert y scheduler
  components/          # mapa, hoja de recomendaciones, reportes
  lib/                 # entorno, logs, rate limit, token de dispositivo
scripts/probe-sources.ts
tests/                 # integración y e2e
docs/                  # intención, investigación y ADR
tasks/                 # este plan y la lista de tareas
```

## Fuentes de datos y contrato con la realidad

1. **Garajes públicos (capa 194).** 23 aparcamientos; solo 7 tienen dato fresco, 3 están obsoletos y 13 no tienen dato. La app los representa como `live`, `stale` o `unknown`, y jamás como libres cuando no hay dato. La ocupación se deriva de `plazaslibr / plazastota` porque el campo `ocupacion` está mal etiquetado.
2. **Predicción ORA (capas 254/253/252/4).** 257 tramos en la zona centro con cuatro horizontes. Se etiqueta como «predicción municipal» con la hora en que la consultamos; no es un sensor en vivo.
3. **Inventario ORA (capa 205).** 33.503 líneas de pintura regulada para dar contexto visual.
4. **Reportes de la comunidad.** Señal anónima, caduca a los 15 minutos, con límite de frecuencia por dispositivo.
5. **Cámaras (capa 190).** Solo se usan sus metadatos como inventario futuro. Las imágenes están prohibidas para difusión pública, así que no se descargan ni se procesan en el MVP.

## Modelo de dominio

### Disponibilidad

```
garaje:   availability = plazaslibr / plazastota        (null si plazaslibr < 0 o plazastota <= 0)
calle:    availability = 1 - ocupacionPct / 100         (acotado a [0, 1])
reporte:  señal cualitativa, no un porcentaje
```

### Frescura

| Señal | Fresca | Aceptable | Obsoleta |
|---|---|---|---|
| Garaje (hora del dato) | ≤ 5 min | ≤ 20 min | > 20 min |
| Predicción ORA (hora de consulta) | ≤ 60 min | ≤ 6 h | > 6 h |
| Reporte | ≤ 5 min | ≤ 15 min | caducado |

Cada candidato expone `observedAt`, `ageMinutes`, `freshness` (`live`, `recent`, `stale`, `unknown`) y `confidence` (`high`, `medium`, `low`).

### Ranking

```
score = 0.45 * availability
      + 0.30 * proximity
      + 0.15 * freshness
      + 0.10 * reportSignal
```

- `proximity = exp(-distanciaMetros / 800)`: caminar 800 m penaliza de forma natural.
- `reportSignal ∈ [-1, 1]`: positivo si alguien acaba de dejar un hueco, negativo si reporta zona llena, decae linealmente hasta caducar.
- Los candidatos sin disponibilidad conocida no pueden encabezar la lista; se muestran como alternativas «sin datos» con `confidence = low`.
- Toda constante vive en `src/domain/ranking.ts` con pruebas de frontera. La respuesta de la API incluye el desglose para poder explicar la recomendación.

## Contrato de API

| Método y ruta | Propósito | Notas |
|---|---|---|
| `GET /api/parking/nearby?lat&lng&radius&at` | Recomendaciones ordenadas | Respuesta validada con Zod; `Cache-Control: public, s-maxage=30, stale-while-revalidate=60` |
| `GET /api/parking/map?bbox=` | Zonas ORA, garajes y reportes vigentes | Sirve para pintar el mapa sin descargar todo |
| `POST /api/reports` | Crear reporte anónimo | `{ kind: 'spot_free' \| 'area_full', lat, lng, segmentId? }`; límite por dispositivo e IP |
| `GET /api/health` | Estado y última ingesta | Devuelve estado de la base de datos y de cada fuente |
| `GET /api/streets?q=` | Búsqueda de calle para elegir origen manual | Se resuelve contra los tramos ya cargados; sin geocoder externo |

Reglas comunes: coordenadas redondeadas a 10 m, sin identificadores personales, errores en formato `{ error: { code, message } }` y nunca se devuelve un dato sin su `observedAt`.

## Calidad y verificación

- **Unidad:** dominio (disponibilidad, frescura, ranking, reportes) con cobertura mínima del 90 % en `src/domain`.
- **Integración:** ingesta con fixtures guardados (sin red), consultas PostGIS y endpoints con base de datos real levantada por Docker.
- **Humo e2e:** Playwright con geolocalización simulada y respuestas de API fijadas; se comprueba el flujo de dos pasos, la frescura visible y la atribución.
- **Probe de fuentes:** `npm run probe:sources` informa recuentos, campos y frescura, y falla si un esquema cambia. Se ejecuta a mano y en un job nocturno.
- **Lint y tipos:** ESLint + Prettier + `tsc --noEmit`; prohibido `any` y `@ts-ignore` sin justificar.
- **Accesibilidad y rendimiento:** objetivos Lighthouse móvil ≥ 95 en accesibilidad y ≥ 85 en rendimiento.
- **CI:** GitHub Actions con lint, tipos, unidad, integración (servicio Postgres), build y build de Docker.

## Vía paralela: autorización de cámaras

El titular del proyecto solicitará por escrito al Ajuntament de València el uso limitado de imágenes de cámaras para un piloto de estimación de aparcamiento. La solicitud está redactada en [camera-authorization-request.md](../docs/legal/camera-authorization-request.md) e incluye compromisos de tratamiento efímero, sin publicación de imágenes y solo ocupación agregada.

Esta vía **no bloquea** ninguna tarea del MVP. Si la autorización llega, se abre como fase aparte con su propia evaluación de impacto y su propio plan técnico (YOLO o visión clásica, calibración por cámara y suavizado temporal). Si se deniega, el producto sigue igual.

## Índice de tareas

Detalle completo, criterios de aceptación y verificación en [todo.md](./todo.md).

### Fase 0 — Validación y cimientos

- [x] Tarea 1: Probe reproducible de fuentes municipales
- [x] Tarea 2: Andamiaje de la app y puertas de calidad
- [x] Tarea 3: Base de datos PostGIS con esquema y migraciones

### Checkpoint A

- [x] El probe confirma las fuentes y la documentación coincide con la realidad
- [x] `npm run lint`, `typecheck` y `test` pasan en un clon limpio
- [x] `docker compose up -d db` + migraciones funcionan desde cero

### Fase 1 — Ingesta y dominio

- [ ] Tarea 4: Reglas de dominio con pruebas
- [ ] Tarea 5: Ingesta de garajes públicos en vivo
- [ ] Tarea 6: Ingesta de tramos ORA y predicciones

### Checkpoint B

- [ ] Un ciclo de ingesta deja la base de datos con garajes, tramos y cuatro horizontes
- [ ] Los fallos parciales no borran datos anteriores
- [ ] Cobertura del dominio ≥ 90 %

### Fase 2 — Flujo principal

- [ ] Tarea 7: API de recomendaciones cercanas
- [ ] Tarea 8: Mapa y elección de origen
- [ ] Tarea 9: Hoja de recomendación con frescura y confianza
- [ ] Tarea 10: Reportes anónimos de la comunidad

### Checkpoint C

- [ ] Dos toques desde la apertura hasta una recomendación con frescura visible
- [ ] Un reporte aparece en el mapa en menos de 5 segundos y caduca a los 15 minutos
- [ ] Sin ubicación se puede elegir origen manualmente

### Fase 3 — Listo para producción

- [ ] Tarea 11: Legalidad, privacidad, atribución y retención
- [ ] Tarea 12: Stack dockerizado con un solo comando
- [ ] Tarea 13: CI y pruebas e2e
- [ ] Tarea 14: Endurecimiento y lista de lanzamiento

### Checkpoint final

- [ ] CI verde y `docker compose up` levanta web, base de datos e ingesta
- [ ] Atribución CC BY 4.0 y OpenStreetMap visible en todas las vistas con mapa
- [ ] Revisión humana del resultado antes de publicar

### Vía paralela (no bloquea el MVP)

- [ ] Tarea 15: Solicitar y hacer seguimiento de la autorización de cámaras

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Las imágenes de cámaras están prohibidas para difusión | Alto | Fuera del MVP; solicitud de autorización en paralelo ([camera-authorization-request.md](../docs/legal/camera-authorization-request.md)); si se autoriza, procesado en servidor y sin publicar imágenes |
| Solo 7 de 23 garajes tienen dato fresco | Medio | Mostrar `unknown` sin disimular; la predicción ORA y los reportes cubren el resto |
| La predicción ORA cubre solo la zona centro | Medio | Etiquetar cobertura por zona; no extrapolar; los reportes funcionan en cualquier punto |
| Cambios de esquema en los endpoints municipales | Alto | Validación Zod, `ingest_runs`, probe que falla ante deriva y sin borrado ante error |
| Sin SLA del Ayuntamiento | Medio | Caché en servidor, degradación elegante y última copia buena en base de datos |
| Reportes falsos o abusivos | Medio | Caducidad de 15 min, límite por dispositivo e IP, sin cuentas y sin ranking permanente |
| Coste o condiciones del proveedor de tiles | Medio | Estilo configurable por entorno; OpenStreetMap solo en desarrollo |
| Escasez de usuarios al principio | Medio | El valor principal no depende de la comunidad: garajes y predicciones funcionan solos |
| PostGIS en despliegue serverless | Bajo | Documentar Vercel + Neon con conexión pooled; Docker Compose como camino principal |

## Preguntas abiertas

- ¿Solicitamos autorización municipal por escrito para el piloto de cámaras?
- ¿Autohospedaje Docker o Vercel + Neon?
- ¿Qué proveedor de tiles usamos en producción?
- ¿Interfaz solo en español o bilingüe?
