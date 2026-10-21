# Despliegue

Aparcat se despliega en **Vercel** (web Next.js) con una base **PostgreSQL + PostGIS en Neon**. La ingesta de datos necesita un proceso aparte: **Railway** (recomendado) o un **cron de GitHub Actions**.

```
Navegador
   │
   ▼
Vercel (Next.js) ──► Neon (PostgreSQL + PostGIS)
   ▲
   │
Worker de ingesta (Railway o GitHub Actions) ──► Ayuntamiento de València
```

No hace falta ningún contenedor para la web. El worker sí necesita un host con Node.js (Railway) o un cron.

## 0. Antes de empezar

- Node.js 22 o superior y Git.
- Cuenta en [Neon](https://neon.tech), [Vercel](https://vercel.com) y [MapTiler Cloud](https://cloud.maptiler.com/account/keys/).
- El repositorio subido a GitHub.

**Importante:** Vercel y GitHub Actions despliegan **el último commit de la rama**, no los cambios locales sin subir. Antes de desplegar:

```powershell
git status
git add -A
git commit -m "chore: preparar despliegue"
git push origin main
```

Comprueba que la CI pasa en GitHub (`.github/workflows/ci.yml`). En local equivale a:

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

## 1. Crear la base de datos en Neon

1. En el panel de Neon, **New Project** y elige la región más cercana (Frankfurt, `eu-central-1`).
2. Abre **SQL Editor** sobre la base de datos del proyecto y activa PostGIS:

   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

3. En **Connect**, copia **dos** cadenas de conexión:
   - **Pooled** (el host contiene `-pooler`): para la web en Vercel.
   - **Direct** (sin `-pooler`): para migraciones, ingesta y copias de seguridad.
4. Aplica las migraciones desde tu máquina con la cadena **directa**:

   ```powershell
   $env:DATABASE_URL = 'postgresql://USUARIO:CLAVE@HOST_DIRECTO/neondb?sslmode=require'
   npm run db:migrate
   ```

   También puedes ponerla en `.env.local` (está ignorado por Git) y ejecutar `npm run db:migrate`.

5. Verifica en el SQL Editor:

   ```sql
   select postgis_version();
   select name from schema_migrations order by name;
   ```

   Deben aparecer `0001_init.sql`, `0002_ora_markings.sql` y `0003_traffic_cameras.sql`.

Las migraciones son **aditivas** y cada una se aplica en su propia transacción. No edites una migración ya aplicada: crea una nueva.

## 2. Configurar MapTiler

1. Crea una API key en MapTiler Cloud.
2. En la configuración de la key, en **Allowed HTTP Origins**, añade sin protocolo ni puerto:
   - `localhost`
   - `127.0.0.1`
   - tu dominio de producción (por ejemplo `aparcat.vercel.app` y `tudominio.com`)
   - si usas previews de Vercel, añade también esos dominios o permite `*.vercel.app` si tu plan lo admite.
3. Deja **Allowed user-agent header** vacío para la web: el navegador no permite fijar un User-Agent propio.
4. No necesitas una key de servidor: el mapa y el geocoding usan `NEXT_PUBLIC_MAPTILER_KEY` desde el navegador.

Sin key, el mapa muestra un fondo neutro y las capas de datos siguen funcionando; la búsqueda no devuelve sugerencias (se puede tocar el mapa o usar la ubicación).

## 3. Variables de entorno

Define estas variables en Vercel para **Production** y **Preview**:

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Cadena **pooled** de Neon para las rutas API. |
| `REPORT_SALT` | Sí | Sal aleatoria para anonimizar el dispositivo de los reportes. Cámbiala respecto a la de desarrollo. |
| `NEXT_PUBLIC_MAPTILER_KEY` | Recomendada | Key pública de MapTiler. Se compila en el bundle. |
| `NEXT_PUBLIC_MAPTILER_STYLE` | No | `streets-v4` (por defecto), `dataviz-v2`, `basic-v2`... |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Recomendada | Correo visible en aviso legal y privacidad. |
| `LOG_LEVEL` | No | `info` por defecto; `debug` para diagnosticar. |

Genera la sal con:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`NEXT_PUBLIC_*` se fija **en tiempo de build**: si cambias la key, el estilo o el correo, vuelve a desplegar.

El worker de ingesta usa además `VALENCIA_TRAFFIC_BASE_URL`, `INGEST_USER_AGENT` e `INGEST_TIMEOUT_MS`; sus valores por defecto son válidos, pero conviene definir `INGEST_USER_AGENT` con una URL de contacto.

## 4. Desplegar la web en Vercel

### Opción A: integración con GitHub (recomendada)

1. Entra en <https://vercel.com/new> e importa el repositorio `vsornosa1/parkflow`.
2. Framework preset: **Next.js**. Root directory: `./`. No cambies el build command (`next build`).
3. Añade las variables del paso 3 en **Environment Variables** (Production y Preview).
4. Pulsa **Deploy**.
5. Cuando termine, abre la URL de producción. Vercel usará Node 22 por el campo `engines` de `package.json`.

El `postinstall` del proyecto copia el worker de MapLibre a `public/`; no hay que hacer nada más.

### Opción B: CLI de Vercel

```powershell
vercel login
vercel link
vercel env add DATABASE_URL production
vercel env add REPORT_SALT production
vercel env add NEXT_PUBLIC_MAPTILER_KEY production
vercel --prod
```

La CLI despliega **el directorio local**, incluidos cambios sin commitear; la integración con Git despliega el commit publicado. Elige una vía y sé consistente.

## 5. Migraciones en cada despliegue

- **Primer despliegue:** se aplican en el paso 1.
- **Cambios de esquema:** aplica la migración con la cadena directa **antes** de desplegar el código que la usa.
- **No** ejecutes `npm run db:migrate` en el build de Vercel: varios builds concurrentes podrían competir por las mismas migraciones.
- Si quieres automatizarlo, crea un job manual o programado en GitHub Actions con `DATABASE_URL` como secreto y ejecuta `npm run db:migrate`. Mantén una sola ejecución a la vez.

## 6. Ingesta de datos (obligatoria para que haya datos)

Vercel no ejecuta procesos persistentes, así que `npm run ingest:watch` no puede vivir ahí. Sin worker, la base se queda vacía o con datos antiguos y la app muestra «sin datos» o «antiguo» (nunca inventa plazas libres).

El scheduler ejecuta:

| Trabajo | Frecuencia |
| --- | --- |
| Garajes públicos | 60 s |
| Aparcamiento regulado | 5 min |
| Marcas ORA | 24 h |
| Cámaras (solo metadatos) | 24 h |
| Purga de reportes caducados | 1 h |
| Purga de historial de ingestas | 24 h |

`npm run ingest` hace una pasada completa, en orden, sin quedarse escuchando.

### Opción A: Railway (recomendado, mantiene los 60 s)

1. Crea un proyecto en [Railway](https://railway.app) y elige **Deploy from GitHub repo**.
2. Selecciona este repositorio.
3. En **Settings**:
   - Build command: `npm ci`
   - Start command: `npm run ingest:watch`
   - No expongas dominio público: es un worker.
   - Reinicio automático en caso de fallo.
4. Añade las variables:
   - `DATABASE_URL` con la cadena **directa** de Neon.
   - `LOG_LEVEL=info`
   - `INGEST_USER_AGENT=aparcat/0.1 (+https://github.com/vsornosa1/parkflow)`
5. Revisa los logs: deben aparecer mensajes `Ingesta programada` sin errores y `GET /api/health` debe listar las fuentes.

### Opción B: cron de GitHub Actions (gratis, pero sin 60 s)

Crea `.github/workflows/ingest.yml` (o ejecútalo a mano con **Run workflow**):

```yaml
name: Ingesta

on:
  schedule:
    - cron: '*/10 * * * *'
  workflow_dispatch:

concurrency:
  group: ingest
  cancel-in-progress: false

jobs:
  ingest:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      LOG_LEVEL: info
      INGEST_USER_AGENT: aparcat/0.1 (+https://github.com/vsornosa1/parkflow)
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run ingest
```

Guarda `DATABASE_URL` (cadena directa) en **Settings → Secrets and variables → Actions**. El cron mínimo es de 5 minutos, GitHub puede retrasarlo y la frescura de garajes será de minutos, no de 60 s.

### Primera carga

Antes de arrancar el scheduler, comprueba las fuentes y haz una pasada completa:

```powershell
$env:DATABASE_URL = 'postgresql://USUARIO:CLAVE@HOST_DIRECTO/neondb?sslmode=require'
npm run probe:sources
npm run ingest
```

`probe:sources` avisa si el Ayuntamiento cambió el esquema. `ingest` debe terminar con código 0; si alguna fuente falla, el detalle queda en `ingest_runs` y en `/api/health`.

## 7. Verificación tras el despliegue

Sustituye `https://TU-DOMINIO` por la URL real:

```powershell
curl.exe -s https://TU-DOMINIO/api/health
curl.exe -s "https://TU-DOMINIO/api/parking/nearby?lat=39.4699&lng=-0.3763&radius=800"
curl.exe -s "https://TU-DOMINIO/api/parking/map?bbox=-0.42,39.44,-0.33,39.50"
curl.exe -s -X POST https://TU-DOMINIO/api/reports `
  -H "content-type: application/json" `
  -H "x-device-id: 00000000-0000-4000-8000-000000000000" `
  -d '{"kind":"spot_free","latitude":39.4699,"longitude":-0.3763}'
```

Qué debe pasar:

- `/api/health` devuelve `status: "ok"`, `database: "ok"` y una entrada por fuente en `ingest`.
- `/api/parking/nearby` devuelve recomendaciones con `freshness` y `confidence`, o una lista vacía con motivo.
- `/api/parking/map` devuelve un `FeatureCollection` con garajes, ORA y reportes.
- `POST /api/reports` devuelve `201` y una caducidad de unos 15 minutos.
- La home carga el mapa, las capas y la geolocalización sin errores de CSP en la consola.
- En Vercel, **Logs** no muestra errores de conexión a la base.

## 8. Vercel Web Analytics

La app ya incluye `@vercel/analytics` (`<Analytics />` en `src/app/layout.tsx`). No requiere variables de entorno ni cambios de build.

1. En Vercel, abre el proyecto y ve a **Analytics** en la barra lateral.
2. Pulsa **Enable**. Al desplegar, Vercel añade las rutas `/_vercel/insights/*` y `/<ruta-única>/*` al proyecto.
3. Vuelve a desplegar para que el script quede disponible.

Notas:

- Las visitas solo se registran en despliegues de Vercel; en desarrollo el paquete no envía datos.
- El script y el intake son del mismo origen, así que la CSP de `next.config.ts` no necesita dominios externos en producción. En desarrollo se permite `https://va.vercel-scripts.com` para cargar `script.debug.js`.
- Si usas un proxy inverso delante de Vercel, debe reenviar `/_vercel/insights/*` y `/<ruta-única>/*`.
- No usa cookies ni identificadores personales; el detalle está en la página de privacidad. Si cambias el modo de analítica, actualiza también esa página.

## 9. Dominio propio

1. En Vercel: **Settings → Domains → Add**, y configura el DNS que indique Vercel.
2. Añade el dominio a **Allowed HTTP Origins** en MapTiler.
3. Si cambias `NEXT_PUBLIC_*`, vuelve a desplegar; el dominio por sí solo no requiere rebuild.

## 10. Operación

- **Salud:** `GET /api/health` (estado de la base y última ingesta por fuente).
- **Logs:** Vercel para la web, Railway o GitHub Actions para la ingesta. Pino emite JSON.
- **Copias:** usa la cadena directa.

  ```powershell
  pg_dump "$env:DATABASE_URL" > backup.sql
  ```

- **Retención:** los reportes caducan a los 15 minutos y se purgan cada hora; el historial de ingestas se purga a diario.
- **Rollback de la web:** Vercel → **Deployments** → **Promote to Production** sobre un despliegue anterior. Las migraciones son aditivas, así que volver atrás no rompe el esquema.
- **Rollback de datos:** restaura `backup.sql` solo si una migración destructiva lo exige (hoy no hay ninguna).

## 11. Problemas comunes

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `Falta DATABASE_URL` | Variable ausente en el entorno desplegado | Añádela en Production y Preview y vuelve a desplegar. |
| `/api/health` devuelve 503 | Neon suspendido, cadena incorrecta o PostGIS sin activar | Comprueba la cadena, `select postgis_version()` y los logs. |
| `type "geometry" does not exist` | PostGIS no está activo en esa base | `CREATE EXTENSION IF NOT EXISTS postgis;` |
| El mapa sale en gris | Falta la key en el build o el origen no está permitido | Revisa `NEXT_PUBLIC_MAPTILER_KEY`, los orígenes de MapTiler y vuelve a desplegar. |
| «Sin datos» o «antiguo» en todo | La ingesta no se ejecuta o el Ayuntamiento no responde | `npm run probe:sources`, luego `npm run ingest`; revisa `/api/health`. |
| `too many connections` | Se usa la cadena directa en la web | Usa la cadena **pooled** en `DATABASE_URL` de Vercel. |
| El build falla en `postinstall` | No se copió el worker de MapLibre | Ejecuta `npm ci` en local y revisa `scripts/copy-maplibre-worker.mjs`. |
| Las previews no cargan teselas | Dominio de preview no autorizado en MapTiler | Añade el dominio o usa la key sin restricción temporal. |
| Analytics sin datos | No está activada en el panel o falta redesplegar | Activa **Analytics** en el proyecto de Vercel y vuelve a desplegar. |

## 12. Checklist de lanzamiento

- [ ] Cambios commiteados y push a `main`; CI en verde.
- [ ] Neon creado y PostGIS activo.
- [ ] Migraciones aplicadas (`schema_migrations` con las tres filas).
- [ ] Variables de entorno definidas en Vercel.
- [ ] `REPORT_SALT` aleatoria y distinta de la de desarrollo.
- [ ] Key de MapTiler restringida al dominio.
- [ ] Analytics activada en Vercel y redesplegada.
- [ ] Web desplegada y `/api/health` en `ok`.
- [ ] `npm run probe:sources` sin errores.
- [ ] Primera ingesta completada y worker programado.
- [ ] Smoke test de mapa, recomendaciones y reportes.
- [ ] Copia de seguridad inicial.

## Cámaras

El producto público no usa imágenes de cámaras. Solo publica su ubicación y un enlace al visor oficial. Cualquier piloto con imágenes requiere autorización escrita del Ayuntamiento y la evaluación de impacto correspondiente; ver [camera-authorization-request.md](./legal/camera-authorization-request.md).