# Intención: Parkflow Valencia

**Estado:** confirmada el 2026-10-19
**Ámbito:** Valencia ciudad
**Repositorio:** `vsornosa1/parkflow`

## Declaración de intención

- **Resultado:** una webapp que ayude a encontrar antes un aparcamiento libre cercano en Valencia, con disponibilidad casi en tiempo real.
- **Usuario:** conductores que están buscando sitio en ese momento.
- **Enfoque:** combinar datos abiertos municipales con reportes de la comunidad para recomendar sitios observados, mostrando siempre su antigüedad y confianza. No se garantiza ni se reserva la plaza.
- **Ubicación:** se solicita bajo demanda y solo mientras la webapp está en uso. Si se deniega, se puede elegir el origen en el mapa o buscar una calle. Sin geofencing ni seguimiento en segundo plano.
- **Éxito:** que el conductor encuentre antes un sitio cercano que dando vueltas a ciegas.
- **Calidad:** código claro y mantenible, con pruebas automatizadas y un stack dockerizado.

## Contexto y por qué ahora

La idea original partía de reutilizar cámaras de tráfico públicas y detectar huecos con visión artificial. Al investigar las fuentes de Valencia se comprobó que ese camino no es viable para una webapp pública en su forma actual:

- Las cámaras municipales se publican como stream RTSP a través de un reproductor propio, no como snapshots periódicos.
- La propia página de visualización prohíbe expresamente la grabación, reproducción, difusión o cesión de las imágenes en otras páginas web.

Por tanto, el MVP no usará imágenes de cámaras. La disponibilidad se construirá con datos abiertos del Ayuntamiento (licencia CC BY 4.0) y con reportes anónimos de los usuarios, que además aportan la señal verdaderamente reciente en la calle.

## Hallazgo que cambia el enfoque

| Camino | Viabilidad | Decisión |
|---|---|---|
| Cámaras municipales + detección | Bloqueado sin autorización escrita; no hay snapshots públicos | Fuera del MVP; se solicita autorización en paralelo |
| Datos abiertos de aparcamientos y ORA | Verificados y con licencia CC BY 4.0 | Base del MVP |
| Reportes de comunidad | Legal, en tiempo real y sin coste de cómputo | Señal complementaria |

La detección con visión artificial queda como piloto futuro **solo con autorización municipal por escrito**, procesando imágenes en servidor, sin publicarlas y aplicando anonimización. Para ese piloto, YOLO o visión clásica serían preferibles a un modelo grande tipo Grounding DINO por coste y latencia.

## Dirección recomendada

1. **Mapa de Valencia** con zonas ORA, aparcamientos públicos y reportes recientes.
2. **Recomendación cercana** ordenada por probabilidad de hueco, distancia a pie y frescura de la señal.
3. **Disponibilidad en garajes públicos** cuando el dato municipal es reciente; los garajes sin dato se muestran como «sin datos», nunca como libres.
4. **Predicción municipal de ocupación ORA** en la zona centro, etiquetada como predicción y con la hora de consulta.
5. **Reportes anónimos** de «he dejado un hueco» o «zona llena», con caducidad de 15 minutos.
6. **Ubicación bajo demanda**, alternativa manual y atribución visible de los datos.

## Supuestos a validar

- [ ] Los endpoints del Ayuntamiento responden con la frecuencia y estabilidad suficientes para una webapp pública (medir durante una semana con el probe de fuentes).
- [ ] La cobertura de predicción ORA (257 tramos en la zona centro) aporta valor suficiente aunque no cubra toda la ciudad.
- [ ] Los reportes de comunidad alcanzan densidad útil en las zonas monitorizadas; sin usuarios, la app sigue siendo útil gracias a garajes y predicciones.
- [ ] Los usuarios entienden la diferencia entre «probabilidad alta», «dato en vivo» y «sin datos recientes».
- [ ] El coste del proveedor de tiles del mapa es asumible para el tráfico esperado.

## Fuera de alcance (MVP)

- **Cola o reserva virtual:** no hay masa crítica de usuarios y la app no controla quién llega antes ni impide que otro conductor aparque.
- **Geofencing y rutinas** (casa, trabajo, gimnasio): consumo de batería, privacidad y complejidad innecesarios para validar el valor principal.
- **Detección por cámaras:** bloqueada legalmente sin autorización; además no hay snapshots públicos.
- **Cuentas de usuario, pagos o integración con apps de navegación:** no hacen falta para responder «¿dónde aparco ahora?».
- **Cobertura de toda la ciudad con datos en vivo:** se mostrará la cobertura real y se evitará simular datos.

## Preguntas abiertas

- **Resuelto:** sí se solicitará por escrito autorización al Ayuntamiento para el piloto de cámaras. La solicitud está preparada en [camera-authorization-request.md](../legal/camera-authorization-request.md) y no bloquea el MVP.
- ¿El despliegue será autohospedado con Docker o en Vercel + Neon?
- ¿Qué proveedor de tiles se usará en producción (MapTiler, Protomaps, autohospedado)?
- ¿La interfaz será solo en español o bilingüe castellano/valenciano?
