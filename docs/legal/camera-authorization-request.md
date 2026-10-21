# Solicitud de autorización para reutilizar cámaras de tráfico (Valencia)

**Estado:** preparada, pendiente de envío por el titular del proyecto.
**Objetivo:** conseguir por escrito el permiso del Ajuntament de València para usar las imágenes de sus cámaras de tráfico en un piloto limitado de estimación de aparcamiento libre, sin publicar nunca las imágenes.
**Bloquea el MVP:** no. El MVP funciona con datos abiertos y reportes de comunidad. Esta vía es paralela.

## Qué pedimos exactamente

Pedimos una de estas tres cosas, por orden de preferencia:

1. **Autorización escrita de reutilización** de las imágenes de un conjunto concreto de cámaras durante un piloto de tres meses, con tratamiento efímero en servidor y publicación únicamente de ocupación agregada por zona.
2. Si la reutilización no es posible, **que el Ayuntamiento publique como dato abierto la ocupación agregada** que ya pueda estar calculando con sus propios sistemas de análisis de vídeo. Es más barato para ellos y evita cualquier cesión de imágenes.
3. Si nada de lo anterior es viable, una **reunión técnica** para explorar una API o un flujo de datos agregados que no implique imágenes.

## Antes de enviar

- [ ] Confirmar el listado definitivo de cámaras del piloto (el probe de la tarea 1 puede exportar `idcamara`, `descripcio` y coordenadas).
- [ ] Decidir quién firma la solicitud y con qué datos de contacto.
- [ ] Confirmar que no habrá ánimo de lucro ni publicidad en la webapp.
- [ ] Preparar la evaluación de impacto relativa a la protección de datos (EIPD/DPIA) en borrador, aunque sea preliminar.

## Canal de presentación

- **Vía oficial:** Sede Electrónica del Ajuntament de València (`https://sede.valencia.es`) o Registre General, como instancia general, dirigida al **Servei de Mobilitat** (titular de las cámaras y del Centre de Gestió de Trànsit).
- **Copia informativa:** Oficina de Dades Obertes / Transparència (responsable del portal `opendata.vlci.valencia.es`, donde ya publican los datos de tráfico con licencia CC BY 4.0).
- **Guardar siempre:** número de registro, fecha y justificante. Sin registro no hay trazabilidad.
- **Recordatorio legal:** la ciudad es la responsable del tratamiento. La reutilización para una finalidad distinta a la gestión de tráfico exige base jurídica y, previsiblemente, una evaluación de impacto. Nosotros nos ofrecemos a firmar el encargo de tratamiento o el convenio que ellos consideren necesario.

## Borrador de solicitud

> **Asunto:** Solicitud de autorización para el uso limitado de imágenes de cámaras municipales de tráfico con fines de información de aparcamiento (proyecto Aparcat)
>
> **Destinatario:** Servei de Mobilitat de l'Ajuntament de València
>
> Estimados señores:
>
> Me dirijo a ustedes en relación con las cámaras de gestión de tráfico del Centre de Gestió de Trànsit, cuyos metadatos se publican en el portal de datos abiertos municipal (capa 190 del servicio `OPENDATA/Trafico/MapServer`).
>
> Soy [nombre], responsable del proyecto **Aparcat**, una aplicación web sin ánimo de lucro, de código abierto y sin publicidad, cuyo único objetivo es ayudar a los conductores a encontrar aparcamiento disponible en la ciudad y reducir así el tráfico de búsqueda y las emisiones asociadas. El código del proyecto es público en [repositorio].
>
> **Solicito** autorización para utilizar, con carácter exclusivamente experimental y durante un máximo de tres meses, las imágenes de un conjunto limitado de cámaras de tráfico (anexo A), con el único fin de estimar la ocupación de plazas de aparcamiento en la vía pública.
>
> **Compromisos que asumo:**
>
> 1. Las imágenes **no se publicarán, ni se cederán, ni se difundirán** en ningún caso, ni total ni parcialmente.
> 2. Las imágenes se procesarán de forma **efímera en memoria**; no se almacenarán una vez obtenida la inferencia, salvo un registro técnico de la ejecución sin contenido de imagen.
> 3. No se realizará **identificación biométrica, reconocimiento facial ni lectura de matrículas**. Si por razones técnicas fuera necesario almacenar alguna imagen temporalmente, se aplicará difuminado de personas y matrículas antes de cualquier persistencia.
> 4. El resultado almacenado será únicamente **ocupación agregada por zona** (número de huecos libres estimados), sin referencia a personas ni vehículos concretos.
> 5. La frecuencia de consulta no superará **una imagen cada 60 segundos por cámara**, con un identificador de aplicación en las peticiones y sin afectar al servicio de gestión de tráfico.
> 6. El tratamiento se realizará en servidores ubicados en la Unión Europea, con cifrado en tránsito y en reposo, control de acceso y registro de operaciones.
> 7. Me comprometo a elaborar y presentar una **evaluación de impacto relativa a la protección de datos** y a firmar cualquier encargo de tratamiento o convenio que el Ayuntamiento considere necesario.
>
> **Alternativa solicitada:** si la cesión de imágenes no fuera posible, agradecería que valoraran publicar como dato abierto la ocupación agregada de aparcamiento que ya pudieran calcular con sus propios sistemas de análisis de vídeo. En ese caso, Aparcat consumiría esa API sin acceder a ninguna imagen.
>
> Agradecería que, si lo consideran oportuno, nos indiquen el área o servicio competente y la documentación adicional que debamos aportar.
>
> Atentamente,
> [nombre y datos de contacto]
>
> **Anexo A:** listado de cámaras propuestas (`idcamara`, descripción y coordenadas).
> **Anexo B:** descripción técnica del piloto: arquitectura, medidas de seguridad, flujo de datos, retención y ausencia de publicación de imágenes.

## Si la respuesta es negativa o no llega

- Se documenta la respuesta y se mantiene el MVP sin cámaras.
- Se reintenta por la vía de datos abiertos: pedir la ocupación agregada como conjunto de datos públicos.
- No se implementa ningún scraping no autorizado ni se publican imágenes.

## Requisitos técnicos que debe cumplir el piloto (si se autoriza)

- Snapshots o stream RTSP accesible, con credenciales y límites acordados por escrito.
- Procesado en servidor con modelo ligero de detección de vehículos (YOLO o visión clásica), no un modelo multimodal grande.
- Cálculo de huecos por zona calibrada una sola vez por cámara; sin inferencia de identidad.
- Deduplicación y suavizado temporal para evitar falsos positivos: un hueco debe confirmarse en varias capturas.
- Solo se publica la ocupación agregada, con su antigüedad y su confianza.
