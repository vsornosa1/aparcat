# Aparcat · vídeo demo para LinkedIn

**Qué es:** una pieza de 54 s que enseña Aparcat (aparcat.vercel.app), la webapp gratuita para encontrar aparcamiento en València.
**Para quién:** la red de LinkedIn del autor; gente de València que conduce y gente de producto y tecnología.
**Lo que el espectador recuerda:** en València ya no hace falta dar vueltas: Aparcat te enseña dónde hay sitio, y cada hueco que compartes ayuda a otra persona.

## Formato

- 1080 x 1350 (4:5, el formato que más ocupa en el feed), 30 fps, 54 s (la primera versión duraba 45 s; se ralentizó un 20 % para que dé tiempo a leer cada escena).
- Sin voz: todo el mensaje va en pantalla (la mayoría lo verá sin sonido). Música original a 100 BPM: kalimba, un silbido como gancho y percusión ligera.
- Tono: startup, rápido y con energía, pero cercano y altruista. Nada de palabras huecas.
- Créditos: solo la URL y la marca. Atribución pequeña de datos (Ajuntament de València) y mapa (© OpenStreetMap) en el cierre.

## Look

- Tipografía de la app: Geist (titulares 800 y 900, interfaz 500 y 600) y Geist Mono para cifras y URL.
- Paleta de la app: esmeralda #059669 como acento (garajes, botones, marca), zinc para texto y bordes, fondo claro #F8FAFC.
- Colores ORA de la app: azul #2563EB, naranja #F97316, verde #16A34A, amarillo #EAB308. Cámaras #475569. Reportes #7C3AED.
- Arco tonal: el problema es de noche (fondo #0A0F1A, rojo de "COMPLET"); la luz llega con Aparcat (fondo claro); la misión, al atardecer en el Túria; el cierre, de noche en la Ciutat de les Arts.
- Motivo: el pin verde con la P de los garajes de la app. El sello rojo "COMPLET" se convierte en ese pin.
- La interfaz de la app se reconstruye en React con sus estilos reales (no se graba la web).
- Mapas dibujados con datos reales: calles de OpenStreetMap, garajes, cámaras y zonas ORA de la API de Aparcat.

## Guion por bloques

Tiempos de la primera versión (45 s); en la actual todo dura un 20 % más.

| Tiempo | Bloque | Texto en pantalla | Visual |
|---|---|---|---|
| 0:00 | Gancho | Russafa. Viernes. 20:30. / VUELTA 1, 2, 3, 4 | Mapa nocturno real de Russafa; un coche da vueltas a la manzana de Sueca, Dénia, Cadis y Puerto Rico |
| 0:03 | Problema | Alameda · Russafa · Benimaclet · La Malva-rosa + COMPLET | Calle de coches aparcados que se desplaza por los barrios; cada barrio, su icono y un sello COMPLET |
| 0:07 | Giro | (silencio) | Empuje hacia el último sello, que se reduce a un punto |
| 0:08 | Marca | Aparcat · Valencia / aparcat (val.): aparcado | El punto rojo se vuelve el pin verde de la P y abre la luz |
| 0:10 | Demo | Abre. Toca. Listo. / Sin descargas. Sin registro. | Móvil sobre el skyline con el diseño nuevo (mapa a pantalla completa y panel deslizable); "Buscar cerca de mí"; resultados reales en la Alameda; el dedo baja el panel y el mapa queda libre |
| 0:14 | Garajes | Plazas libres en los parkings públicos / Con datos del Ajuntament, en directo | El mapa sale del móvil; garajes reales con sus plazas |
| 0:18 | ORA | Las zonas ORA, antes de llegar + leyenda de la app | Las zonas ORA reales se pintan calle a calle |
| 0:22 | Cámaras | Las cámaras de tráfico de València, en tu mapa / 679 cámaras | Capa Cámaras; 679 puntos reales; zoom a Blasco Ibáñez; "Abrir el visor oficial" (corte antes de la imagen) |
| 0:28 | Comunidad | Avisa de tu hueco / Dura 15 minutos. Cuando te vas, otra persona aparca. | Dos móviles en Benimaclet: "He dejado un hueco" y el punto aparece en el otro |
| 0:34 | Misión | Cada hueco que compartes es una vuelta menos para alguien. / Fet a València | El Túria al atardecer |
| 0:40 | Cierre | aparcat.vercel.app / Aparca antes, ayuda al siguiente. | Noche en la Ciutat de les Arts, QR y marca |

## Datos reales e ilustrativos

- Reales: calles (OpenStreetMap), posición de garajes, cámaras (679) y zonas ORA; plazas libres y resultados cercanos de una consulta a la API de Aparcat (22 oct 2026, 00:18).
- Ilustrativos: "Viernes 20:30", el coche que da vueltas, los coches aparcados, el reporte de hueco y la persona que aparca después.
- Nunca se muestra imagen de las cámaras: solo su ubicación y el enlace al visor oficial.
