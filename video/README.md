# Vídeo de Aparcat para LinkedIn

Pieza de 54 s en 4:5 (1080 x 1350, 30 fps) hecha con [Remotion](https://www.remotion.dev) a partir del guion de `design/BRIEF.md`. Es un proyecto aparte: no forma parte del build de la app (está excluido en `tsconfig.json`, ESLint, Prettier y `.vercelignore`).

## Qué es real

- Calles de OpenStreetMap; garajes, cámaras (679) y zonas ORA de la API de Aparcat.
- Plazas libres y resultados cercanos de una consulta del 22 de octubre de 2026 a las 00:18.
- Ilustrativo: "Viernes 20:30", el coche dando vueltas, los coches aparcados, el reporte de hueco y quien aparca después.

## Rehacerlo

```bash
cd video
npm install
sh scripts/fetch-data.sh        # datos reales a data/raw/ (opcional: ya hay una copia procesada en src/data/)
python scripts/build_map.py     # data/raw/ -> src/data/
PYTHON=python sh music/master.sh  # música original -> public/music.wav (-14 LUFS)
npx remotion studio src/index.ts  # previsualizar
```

Render (con el Chrome instalado):

```bash
npx remotion render src/index.ts Main out/render-1x.mp4 --codec=h264 --crf=16 --audio-codec=aac --audio-bitrate=320k --browser-executable="C:/Program Files/Google/Chrome/Application/chrome.exe" --chrome-mode=chrome-for-testing --concurrency=8
ffmpeg -i out/render-1x.mp4 -vf "scale=in_range=full:out_range=limited,format=yuv420p" -color_range tv -c:v libx264 -crf 18 -preset slow -c:a aac -b:a 256k -movflags +faststart out/aparcat-linkedin.mp4
```

`sh scripts/stills.sh <nombre> <frame> ...` saca fotogramas sueltos (en frames del vídeo final, no de historia) y una hoja de contactos en `checks/`.

## Estructura

- `src/timing.ts`: la lista de cortes, en "frames de historia" (un pulso son 15). `SPEED = 1.2` los reproduce más despacio: en pantalla un pulso dura 18 frames (100 BPM). Para cambiar el ritmo de todo el vídeo basta con tocar `SPEED` (y la misma constante en `music/score.py`).
- `src/scenes/`: gancho, montaje de barrios, marca y demo, mapa, comunidad y cierre.
- `src/ui/`: mapa, móvil, interfaz de la app reconstruida, ilustraciones y marca.
- `music/score.py`: la banda sonora ("kalimba pop" a 100 BPM con un silbido como gancho), sintetizada con numpy y sincronizada con los mismos frames. Si prefieres una canción con licencia, sustituye `public/music.wav` por un WAV de 54 s.
