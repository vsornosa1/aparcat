# Fuentes de datos de Valencia (verificadas 2026-10-19)

Todas las comprobaciones se hicieron con peticiones reales desde este repositorio. Los datos del Ayuntamiento de València se publican con licencia **CC BY 4.0**, por lo que es obligatorio atribuir la fuente en la interfaz.

## 1. Aparcamientos públicos con disponibilidad (MapServer capa 194)

- **Endpoint:** `https://geoportal.valencia.es/server/rest/services/OPENDATA/Trafico/MapServer/194/query?where=1=1&outFields=*&f=geojson`
- **Registros:** 23 aparcamientos públicos.
- **Campos:** `nombre`, `direccion`, `id_aparcamiento`, `plazastota`, `plazaslibr`, `ultima_mod`, `ocupacion`, `fiwareid`.
- **Estado observado:**
  - 7 aparcamientos con `plazaslibr` y `ultima_mod` frescos (mismo día, minutos antes).
  - 3 con valores numéricos pero de hace meses (última modificación en abril de 2026 o septiembre de 2025).
  - 13 sin dato (`plazaslibr` = `-1` o `-2`, `ultima_mod` en 1970 o 2023).
- **Trampa detectada:** el campo `ocupacion` **no es ocupación**, es el porcentaje de plazas libres. Ejemplo: `AVINGUDA DE L'OEST` tiene 257 plazas totales, 177 libres y `ocupacion = 68,87` (= 177/257). Hay que derivar la ocupación de `plazaslibr / plazastota` y no confiar en ese campo.
- **`ultima_mod`:** se devuelve como epoch en milisegundos.

## 2. Predicción de ocupación del aparcamiento regulado (capas 254, 253, 252, 4)

- **Endpoints (horizonte / campo):**
  - 1 hora: `.../Trafico/MapServer/254/query?...&f=geojson` → `ocupacion_1`
  - 6 horas: `.../Trafico/MapServer/253/query?...&f=geojson` → `ocupacion_6`
  - 12 horas: `.../Trafico/MapServer/252/query?...&f=geojson` → `ocupacion_12`
  - 24 horas: `.../Trafico/MapServer/4/query?...&f=geojson` → `ocupacion_24`
- **Registros:** 257 tramos de calle con nombre (`nombre_via`, `id_tramo`).
- **Semántica:** el valor es un porcentaje de ocupación. El propio renderizador del Ayuntamiento interpreta:
  - `< 60` → alta probabilidad de estacionamiento
  - `60–80` → probabilidad media
  - `> 80` → baja probabilidad
- **Cobertura limitada:** la extensión de la capa cubre la zona centro (aproximadamente la Zona de Bajas Emisiones), no toda la ciudad.
- **Frescura:** no expone campo de fecha; solo se puede saber cuándo la consultamos nosotros. Hay que medir la cadencia de actualización con el probe antes de prometer «tiempo real» para esta capa.
- **Valores nulos:** 2 de los 257 tramos devuelven `null` en cada horizonte. Se tratan como ausencia de dato y no borran la predicción anterior; su antigüedad la marcará como obsoleta.

## 3. Inventario de aparcamiento regulado ORA (capa 205)

- **Endpoint:** `https://geoportal.valencia.es/server/rest/services/OPENDATA/Trafico/MapServer/205/query?where=1=1&outFields=*&f=geojson`
- **Registros:** 33.503 líneas de pintura del aparcamiento regulado.
- **Campos:** solo `color` (`Amarillo`, `Blanco`, …) y `objectid`; no incluye nombre de calle.
- **Uso previsto:** contexto visual de dónde existe aparcamiento regulado; no aporta disponibilidad.

## 4. Cámaras de tráfico (capa 190) — no usable para publicar imágenes

- **Metadatos:** `https://geoportal.valencia.es/server/rest/services/OPENDATA/Trafico/MapServer/190/query?where=1=1&outFields=*&f=geojson`
- **Registros:** 680 cámaras con `idcamara`, `tipocamara`, `descripcio` y `url` al visualizador.
- **Duplicados:** una cámara aparece dos veces en la capa; el ingest deduplica por `idcamara` y guarda **679 ubicaciones**.
- **Visualizador:** `https://camaras.valencia.es/camaras/visualizador.html?id=<idcamara>`
  - El reproductor carga un stream **RTSP** (`rtsp://camaras.valencia.es/stream/<id>/1`) mediante el player propietario `lanaccess-wsm-player.js`; no hay endpoint público de snapshots.
  - La página incluye este aviso literal: «Queda prohibida la grabación, reproducción, difusión, revelación o cesión de las imágenes obtenidas desde las cámaras del CCTV para la gestión del tráfico del Ayuntamiento de Valencia en otras páginas web.»
- **Conclusión:** ni las imágenes ni datos derivados de ellas pueden publicarse sin autorización escrita. El MVP no las usa.

## 5. Otras capas útiles para contexto

| Capa | Contenido | Uso |
|---|---|---|
| 194 | Parkings públicos | Disponibilidad en vivo |
| 245 | Aparcamientos Zona Bajas Emisiones | Contexto ZBE |
| 197 | Aparcamientos no regulados | Contexto de aparcamiento libre |
| 207 | Plazas para movilidad reducida | Contexto de accesibilidad |
| 195 | Aparcamiento para motos | Contexto |
| 178 | Zonas de carga y descarga | Evitar recomendar zonas prohibidas |
| 192 | Estado del tráfico en tiempo real | Contexto de tráfico |

- **Catálogo completo:** `https://geoportal.valencia.es/server/rest/services/OPENDATA/Trafico/MapServer?f=json`
- **Portal de datos abiertos (CKAN):** `https://opendata.vlci.valencia.es/api/3/action/package_search?q=<término>`

## 6. Consideraciones técnicas

- ArcGIS REST devuelve coordenadas WGS84 con `f=geojson`; el `sourceSpatialReference` de las capas es ETRS89 / UTM 30N (EPSG:25830). Guardar en PostGIS como EPSG:4326 y consultar con `::geography` para distancias en metros.
- Los endpoints no ofrecen SLA ni compromiso de estabilidad. Hay que validar cada respuesta, registrar la ingesta y no borrar datos previos si una consulta falla.
- Conviene identificar la aplicación en el `User-Agent`, cachear en servidor y no martillear al Ayuntamiento.

## 7. Verificación reproducible

El script `scripts/probe-sources.ts` (tarea 1 del plan) reproducirá estas comprobaciones y avisará si un esquema cambia: recuentos, campos presentes, frescura de `ultima_mod` y distribución de valores de ocupación.
