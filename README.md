# Aparcat

Webapp para encontrar aparcamiento libre cerca de ti en Valencia sin dar vueltas.

> **Estado:** MVP completo. El mapa, las recomendaciones, las cámaras (solo ubicación) y los reportes funcionan con datos reales. La CI está configurada y pendiente de ejecutarse en GitHub.

## Cómo funciona

Aparcat combina varias señales legales y complementarias. El mapa arranca con garajes, reportes y zonas ORA; la predicción de calles y las cámaras se activan desde «Capas del mapa»:

- **Garajes públicos:** plazas libres cuando el Ayuntamiento las publica. Si el dato es antiguo o no existe, se muestra «antiguo» o «sin datos», nunca «libre».
- **Reportes de la comunidad:** «he dejado un hueco» o «zona llena», anónimos y con caducidad de 15 minutos.
- **Zonas ORA:** zonas de aparcamiento en calle agrupadas por color: azul (pago), naranja (mixta), verde (residentes) y amarilla (restringida). El color identifica la tarifa; no es una predicción de plazas.
- **Predicción de aparcamiento regulado:** ocupación estimada por el Ayuntamiento para tramos de la zona centro, etiquetada como predicción y con su hora de consulta.
- **Cámaras de tráfico:** solo su ubicación y un enlace al visor oficial. No se descargan ni se publican imágenes.

Cada recomendación muestra su antigüedad y su confianza. La app no reserva ni garantiza plazas.

## Fuentes de datos

Los endpoints, campos, licencias y limitaciones están verificados en [docs/research/valencia-data-sources.md](docs/research/valencia-data-sources.md).

- Datos del Ajuntament de València: **CC BY 4.0**.
- Mapas: **MapTiler** con datos de **OpenStreetMap**.
- **No se usan imágenes de cámaras de tráfico.** Su difusión está prohibida sin autorización escrita; la solicitud está preparada en [docs/legal/camera-authorization-request.md](docs/legal/camera-authorization-request.md).

## Stack

Next.js 16 · TypeScript estricto · Tailwind CSS · PostgreSQL + PostGIS · Drizzle ORM · Vitest.

## Puesta en marcha

Requisitos: Node.js 22+ y una base PostgreSQL con PostGIS (local, Neon, Supabase...).

```bash
npm install
cp .env.example .env.local   # ajusta DATABASE_URL
npm run db:migrate
npm run dev
```

Abre <http://localhost:3000>. Sin key de MapTiler en `.env.local`, el mapa usa el fondo neutro y las capas de datos siguen funcionando. Guía de despliegue en [docs/deploy.md](docs/deploy.md).

## Scripts

| Comando                    | Qué hace                                                                         |
| -------------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`              | Servidor de desarrollo                                                           |
| `npm run build`            | Build de producción                                                              |
| `npm run lint`             | ESLint                                                                           |
| `npm run typecheck`        | TypeScript sin emitir                                                            |
| `npm test`                 | Pruebas unitarias                                                                |
| `npm run test:integration` | Pruebas contra PostgreSQL (requiere PostgreSQL con PostGIS y migraciones)                        |
| `npm run test:coverage`    | Cobertura con umbrales                                                           |
| `npm run test:e2e`         | Playwright con APIs simuladas                                                    |
| `npm run db:migrate`       | Aplica las migraciones pendientes                                                |
| `npm run ingest`           | Ejecuta una ingesta completa (garajes, predicciones, marcas, cámaras y limpieza) |
| `npm run ingest:watch`     | Scheduler continuo: garajes 60 s, predicciones 5 min, marcas 24 h                |
| `npm run probe:sources`    | Verifica que las fuentes municipales siguen respondiendo con el esquema esperado |

El probe admite exportar el anexo de cámaras para la solicitud municipal:

```bash
npm run probe:sources -- --export-cameras=docs/legal/camaras-valencia.csv
```

## API

| Método y ruta                            | Propósito                                                      |
| ---------------------------------------- | -------------------------------------------------------------- |
| `GET /api/parking/nearby?lat&lng&radius` | Recomendaciones ordenadas con frescura, confianza y motivo     |
| `GET /api/parking/map?bbox=`             | Capas GeoJSON de tramos, garajes y reportes vigentes           |
| `GET /api/parking/ora?bbox=`             | Zonas ORA agrupadas de toda la ciudad, coloreadas por tarifa   |
| `GET /api/streets?q=`                    | Búsqueda de calle para elegir el origen sin geolocalización    |
| `POST /api/reports`                      | Reporte anónimo «hueco libre» o «zona llena», caduca en 15 min |
| `GET /api/health`                        | Estado de la base de datos y última ingesta por fuente         |

Los errores usan siempre `{ "error": { "code": "...", "message": "..." } }`. Los reportes se limitan por dispositivo e IP y solo guardan un hash con sal (`REPORT_SALT`).

## Mapa (MapTiler)

`npm install` ejecuta `scripts/copy-maplibre-worker.mjs`, que copia el worker de MapLibre a `public/`.

Crea una API key en [MapTiler Cloud](https://cloud.maptiler.com/account/keys/) y configúrala en `.env.local`:

```bash
NEXT_PUBLIC_MAPTILER_KEY=tu_key
NEXT_PUBLIC_MAPTILER_STYLE=streets-v4   # opcional
```

En la configuración de la key:

- **Allowed HTTP Origins:** `localhost`, `127.0.0.1` y tu dominio de producción, sin protocolo ni puerto (`aparcat.vercel.app`, `tudominio.com`).
- **Allowed user-agent header:** déjalo **vacío** para la web. Los navegadores no permiten fijar un User-Agent propio; ese campo es para apps nativas o peticiones de servidor.

La búsqueda usa MapTiler Geocoding limitado al área de Valencia. Si no hay key, el mapa muestra un fondo neutro con las capas de datos y la búsqueda cae al endpoint local de calles.

En Vercel, define `NEXT_PUBLIC_MAPTILER_KEY` en las variables de entorno del proyecto: se compila en el bundle durante el build.

## Estructura

```text
src/
  api/        contratos, consultas y lógica de las rutas
  app/        rutas y páginas de Next.js
  components/ mapa y componentes de interfaz
  db/         esquema, cliente y migraciones SQL
  domain/     disponibilidad, frescura y ranking (TypeScript puro)
  ingest/     fuentes municipales, upsert y scheduler
  lib/        entorno, logs y utilidades
public/       worker de MapLibre generado en postinstall
scripts/      probe de fuentes, ingesta, migrador y worker
tests/        pruebas de integración, e2e y fixtures
docs/         intención, investigación y legal
tasks/        plan y lista de tareas
```

## Pruebas

Las pruebas unitarias no tocan la red. Las de integración usan la base de `DATABASE_URL` y aplican las migraciones automáticamente. El probe de fuentes es el único que consulta al Ayuntamiento, y se ejecuta a mano o en un job nocturno.

## Plan y decisiones

- Intención confirmada: [docs/intent/valencia-parking.md](docs/intent/valencia-parking.md)
- Plan de implementación: [tasks/plan.md](tasks/plan.md)
- Tareas y criterios de aceptación: [tasks/todo.md](tasks/todo.md)

## Aviso legal

Aparcat no está afiliado al Ajuntament de València. Las señales de tráfico y las normas de estacionamiento prevalecen sobre cualquier recomendación de la app. Consulta [Privacidad](/privacidad) y [Aviso legal](/aviso-legal). El despliegue se documenta en [docs/deploy.md](docs/deploy.md).
