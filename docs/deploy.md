# Despliegue

## Autohospedado con Docker (recomendado)

```bash
docker compose up -d --build
```

El orden es: `db` saludable → `migrate` aplica migraciones y termina → `web` e `ingest` arrancan. La web queda en <http://localhost:3000>.

Comprueba el estado:

```bash
docker compose ps
curl http://localhost:3000/api/health
docker compose logs -f web ingest
```

Variables relevantes (se pueden definir en un `.env` junto al compose):

| Variable | Uso |
| --- | --- |
| `REPORT_SALT` | Sal para anonimizar el identificador de dispositivo. **Cámbiala en producción.** |
| `NEXT_PUBLIC_MAP_STYLE_URL` | Estilo de mapa de un proveedor o autohospedado. Vacío usa OpenStreetMap. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Correo visible en las páginas legales. |

`NEXT_PUBLIC_*` se fija en tiempo de build; si cambias el proveedor de tiles, reconstruye la imagen:

```bash
NEXT_PUBLIC_MAP_STYLE_URL=https://... docker compose build web
```

Parar sin borrar datos:

```bash
docker compose down
```

Borrar también la base de datos:

```bash
docker compose down -v
```

## Vercel + Neon

1. Crea una base PostgreSQL con PostGIS en Neon y copia la cadena de conexión pooled.
2. Define `DATABASE_URL` y `REPORT_SALT` en Vercel.
3. Ejecuta las migraciones desde local o CI: `DATABASE_URL=... npm run db:migrate`.
4. Define `NEXT_PUBLIC_MAP_STYLE_URL` y `NEXT_PUBLIC_CONTACT_EMAIL` en el proyecto.
5. Despliega. Las rutas API usan Node.js y PostGIS; no uses el runtime Edge.

## Mapas en producción

OpenStreetMap solo se usa en desarrollo. Para producción, configura `NEXT_PUBLIC_MAP_STYLE_URL` con MapTiler, Protomaps o una instancia autohospedada, y revisa sus condiciones de uso y atribución.

## Operación

- **Salud:** `GET /api/health` devuelve el estado de la base de datos y la última ingesta por fuente.
- **Ingesta:** el servicio `ingest` refresca garajes cada 60 s, predicciones cada 5 min, marcas y cámaras cada 24 h, y purga reportes caducados cada hora.
- **Copias:** `docker compose exec db pg_dump -U parkflow parkflow > backup.sql`.
- **Vuelta atrás:** las migraciones son aditivas; vuelve a desplegar la imagen anterior y, si hiciera falta, restaura la copia.

## Cámaras

El producto público no usa imágenes de cámaras. Solo publica su ubicación y un enlace al visor oficial. Cualquier piloto con imágenes requiere autorización escrita del Ayuntamiento y la evaluación de impacto correspondiente; ver [camera-authorization-request.md](./legal/camera-authorization-request.md).
