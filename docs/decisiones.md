# Decisiones

Registro de decisiones del proyecto. Lo marcado como **supuesto** sigue sin confirmar.

## 2026-11-05 · Fase 0

- **Empezamos por el front.** El usuario pidió arrancar con el front; el plan original pone la base de datos como Fase 1. Se hizo primero la Fase 0, que es común a ambos caminos. El orden de las fases siguientes está por confirmar.
- **Raíz del repositorio:** `Documents/Carmen-limpio`. El contenido de `entrega-carmen-limpio/` se movió ahí y el prompt quedó en `docs/PROMPT-CARMEN-LIMPIO.md`.
- **Git resuelto.** El repositorio se conectó a GitHub el 2026-11-05, tras probar primero en local. Se borró el `.git` que `create-expo-app` generó en `apps/movil`.
- **Pruebas en emulador:** se usa el AVD `Pixel_8_Pro_API_33` con el controlador AEHD.
- **`ANDROID_HOME` es obligatoria para compilar.** `apps/movil/android/local.properties` la sustituye en esta máquina, pero `android/` es generado: `expo prebuild --clean` borra ese archivo.
- **Versiones instaladas:** Expo 58, React Native 0.88, React 19.3.0, Vite 8, React Leaflet 5, TypeScript 6.0.
- **React con versión exacta** en la app y el panel, porque Expo la fija y dos copias en el monorepo causan errores.
- **Paleta propia** azul petróleo, para no parecerse al verde de los carteles.
- **Identificador Android:** `mx.carmenlimpio.app`. **Supuesto:** es difícil de cambiar una vez publicada la app.
- **`compartido` se consume como TypeScript fuente**, sin paso de compilación. Sus imports llevan `.ts` para que `node --test` los ejecute directamente.
- **`npm audit`:** 5 alertas moderadas en herramientas de desarrollo de Expo (`glob`, `minimatch`). No se corrigen: la solución sugerida degrada a Expo 53.
- **Mapa móvil:** no hay clave de Google Maps, así que el valor predeterminado es MapLibre con OpenStreetMap. Se instalará en la fase de consulta.

## Hallazgos del análisis de datos

- Conteos confirmados: 15 rutas, 123 entradas, confianza 54 alta, 31 media, 12 baja y 26 sin ubicar. Las 15 rutas se cotejaron visualmente con los tres carteles.
- `paradas.geojson` tiene 132 puntos para 90 combinaciones de ruta y lugar: un lugar lineal, como una avenida, genera dos puntos. El cargador no debe tratarlos como duplicados.
- `generar-salidas.ts` y `generar-cobertura.ts` escriben en `supabase/` relativo a su carpeta. Tras la mudanza crearían `herramientas/rutas/supabase/` en lugar de actualizar el `supabase/` de la raíz. Corregir en la Fase 1.
- Hay nombres que el cartel escribe distinto para un mismo sitio (`Avenida Nardos` / `Av. Nardos`, `Av. Puerto de Progreso` / `Av. Puerto Progreso`). La búsqueda debe encontrarlos todos.

## 2026-11-05 · Consulta en la app (parte 1)

- **Proyecto en `C:\carmen-limpio`.** Se copió desde `Documents/Carmen-limpio` por el límite de rutas de Windows. La copia original sigue intacta hasta confirmar que todo funciona.
- **Compilación nativa en Windows.** Los módulos con C++ (`safe-area-context`, `screens`) generan rutas de unos 316 caracteres, sin importar dónde esté el proyecto. El `ninja` 1.10.2 de CMake 3.22 no las admite. Solución: CMake 3.31.6 (lo fija `apps/movil/plugins/cmake-moderno.js`) y `LongPathsEnabled` en Windows.
- **Intentos descartados:** unidad virtual con `subst` (Gradle mezcla las dos rutas) y `CMAKE_OBJECT_PATH_MAX` (CMake no acorta esas rutas).
- **Módulos excluidos:** `react-native.config.js` deja fuera `gesture-handler`, `reanimated` y `worklets`, que npm instala con `expo-router` y la app no usa. Hay que quitarlos de ahí si algún día se usan.
- **`Avenida Nardos` y `Av. Nardos` son un solo lugar** con sus dos rutas (M2 y M4). Por eso hay 120 lugares para 123 entradas.
- **Los lugares sin tipo evidente en el nombre quedan como `otro`.** No se dedujo si son colonias.

## 2026-11-05 · Primera compilación en el emulador

- **Bloqueo de compilación resuelto.** Con CMake 3.31.6 y `LongPathsEnabled`, `expo run:android` compiló e instaló la app en `Pixel_8_Pro_API_33`. La exclusión de `gesture-handler`, `reanimated` y `worklets` no impidió que la app funcionara.
- **Parte 1 probada en el emulador:** búsqueda (con y sin acentos, y sin resultados), detalle, Bivalvo con dos horarios, Renovación VII con su aviso por confirmar y sin mapa, y lugar guardado que persiste al reiniciar.
- **Pendiente de revisar:** al reabrir con el enlace del development build, la app volvió al detalle en lugar de a inicio. Desde el ícono abre en inicio. Falta ver si ocurre fuera del modo de desarrollo.
- **Pendiente:** el splash y el ícono siguen siendo los predeterminados de Expo.

## 2026-11-05 · Consulta por ruta

- **Pedido por el usuario:** lista de rutas y, al elegir una, sus lugares. Se accede con "Ver todas las rutas" en inicio.
- **La lista se separa por turno,** porque el número no identifica una ruta: la Ruta 1 matutina y la vespertina son recorridos distintos.
- **Se habla de "lugares", no de "colonias":** las rutas también incluyen avenidas, privadas y fraccionamientos.
- **Los lugares van en orden alfabético.** Los carteles no indican el orden del recorrido, así que no se sugiere uno.
- **`RUTAS` se deriva de `LUGARES`,** sin regenerar el catálogo. Una prueba la compara con `rutas.json`.

## 2026-11-05 · Mapa en la app

- **Mapa:** `@maplibre/maplibre-react-native` 11 con el servidor público de OpenStreetMap, sin clave. Ese servidor solo sirve para el prototipo: antes de publicar hay que cambiar de proveedor de mapas base.
- **Solo escenario `carteles`.** `generar-trazado.ts` copia el tramo `servicio` y los puntos a `packages/compartido`. `traslado` no se muestra porque no es recolección. Una prueba compara cada línea con `rutas.geojson`.
- **Un punto puede representar varios lugares.** El trazador guarda un punto por nodo, así que 7 lugares ubicados no tenían punto propio: Los Arcos 2, Frac. Esperanza 2, Frac. Héroe de Nacozari 1, Frac. Libertad 2, Priv. San Joaquín, Santa Rita 2 y Santa Rita 3. Se ligan al punto del lugar con la misma ubicación y se conservan los 132 puntos.
- **Frac. San Joaquín y Priv. San Joaquín comparten punto con días distintos,** por eso el mapa lista cada lugar con su propio horario.
- **Cámara con `bounds`, no `initialViewState`.** Con `initialViewState` la Ruta 1 vespertina abría demasiado acercada. `limites` va memorizado para que elegir un punto no reinicie la cámara.
- **Sin conexión:** trazado y puntos vienen en la app. El mapa base solo aparece si sus mosaicos ya estaban en caché.
- **`--port`:** si otro Metro ocupa el 8081, `expo start --port 8082` necesita también `adb reverse tcp:8082 tcp:8082`.
- **Limitación de datos visible:** las rutas V1, V2 y V4 mezclan lugares lejanos entre sí, y su línea atraviesa la isla. El aviso de trazado ilustrativo lo cubre, pero conviene validarlas.

## 2026-11-05 · Panel web (parte 1, solo lectura)

- **Primero solo lectura con datos locales.** Inicio de sesión, edición, avisos y permisos dependen de Supabase, que no está conectado. El panel lo dice en un aviso permanente y no simula esas funciones.
- **Vistas:** Resumen, Rutas, Unidades y Comparar escenarios. Navegación por `#` en la URL, sin agregar un paquete de rutas.
- **`propuesta` vive solo en `apps/panel/public/datos/`.** `generar-propuesta-panel.ts` la copia ahí y el panel la carga bajo demanda. No entra en `packages/compartido`, para que no pueda llegar a la app ciudadana.
- **Dos mapas separados, no capas en un mismo mapa,** porque `M1`, `V1`, etc. no significan lo mismo en ambos escenarios.
- **`UNIDADES` se deriva de las rutas** y sigue siendo un supuesto. Las placas quedan como pendientes.
- **Pendiente de revisar:** la zona V4 de la propuesta incluye un tramo al otro lado del puente, y por eso su mapa abre muy alejado.

## 2026-11-05 · Diseño de la app

- **Tema propio** en `apps/movil/estilos/tema.ts` y componentes en `apps/movil/componentes/ui.tsx`. El azul petróleo sigue como color principal, con ámbar para matutino e índigo para vespertino. Todas las combinaciones de texto cumplen AA (4.5:1 o más).
- **Fuente Figtree** (licencia OFL), integrada al APK con el plugin de `expo-font` para que no parpadee al cargar. Cambiarla exige recompilar.
- **Ícono y splash:** el pin inicial fue reemplazado por el camarón (ver "Logo del camarón").
- **Días en círculos L M M J V S D,** siempre acompañados del texto con la ventana. Ver los días no reemplaza la advertencia de que no es una hora de llegada.
- **Probado en 720×1280 con letra al 130%:** todo cabe. La rueda de desarrollo tapa parte del título, pero no existirá en la versión final.
- **Metro se cuelga tras recompilar.** Si no responde, hay que levantar uno nuevo.

## 2026-11-05 · Rediseño con mapa y panel deslizable

- **Referencia del usuario:** capturas de Wanderlog en before.click. Se tomaron patrones de interfaz (mapa con panel inferior, pestañas, pastillas de día, botones flotantes, listas planas), no su marca, colores, iconos ni textos.
- **`mapa/[rutaId]` reemplaza a `rutas/[id]`.** Mapa y lista quedan en una sola pantalla, con panel de tres posiciones.
- **Panel con `Animated` y `PanResponder`.** `gesture-handler` y `reanimated` siguen excluidos por el límite de rutas de Windows, así que no se usan librerías de hojas inferiores.
- **Sin puntos numerados.** La referencia numera sus paradas, pero los carteles no indican el orden del recorrido y numerar sugeriría uno.
- **Sin fotos de lugares:** no hay imágenes con derechos de uso y no se inventan.
- **Filtro por día en el mapa.** `paradasDelDia` respeta las excepciones por lugar. Filtra la lista y los puntos, no la línea, porque el trazado es uno solo por ruta.
- **`BarraEstado`** fija el color de la barra de estado al enfocar cada pantalla.
- **Trazado ilustrativo** siempre visible en una etiqueta sobre el mapa, y la atribución de OpenStreetMap también. El texto completo está en la pestaña Horario.
- **Faltan colores de fondo vivos:** quedaron para las capturas de la tienda, no para la app.

## 2026-11-05 · Logo del camarón

- **Mascota elegida por el usuario** como ícono y pantalla de carga, por ser representativa de Ciudad del Carmen. Reemplaza al pin de ubicación.
- **Derechos resueltos el 2026-11-06:** el usuario confirmó que el camarón es diseño propio. La imagen es una captura de 403×337 con el texto "¡Uh chito!".
- **Tratamiento:** se quitó el fondo gris, se agregó un borde blanco de calcomanía y se colocó sobre el azul petróleo. El globo solo aparece en la pantalla de carga: en el ícono no se leería.
- **Android recorta en círculo:** el ícono visible es 683 de 1024 píxeles y el splash, 2/3 del lienzo. Por eso el dibujo mide 520 píxeles en ambos, y `imageWidth` es 288.
- **Calidad:** la captura se amplió y se ve bien en el teléfono, pero conviene pedir el archivo original en alta resolución antes de publicar. El recorte base está en `apps/movil/assets/fuente/`.

## 2026-11-06 · Camión simulado para la demostración

- **Adelanto parcial de la Fase 5,** pedido por el usuario para presentar el prototipo. Es local: todavía no escribe en `posiciones_unidad` porque Supabase no está conectado.
- **Usa el trazado `carteles` de la misma ruta,** nunca geometría de `propuesta`, porque corre en la app ciudadana.
- **Siempre etiquetado:** arranca solo con el botón del mapa, lleva "Simulación" pegado al marcador y un aviso visible mientras corre.
- **Velocidad acelerada:** 150 m/s, con duración de 20 segundos a 2 minutos por vuelta. No muestra hora ni tiempo de llegada, y al terminar vuelve a empezar.

## 2026-11-06 · Presencia visual, etapa 1: inicio con tarjeta "Hoy"

- **Textos ajustados al prompt:** "Recolección en curso" sugería que el camión estaba operando. Se usa "Ventana de recolección abierta" y "Hoy es día de recolección", con la nota "Según carteles públicos; el horario puede variar".
- **`estadoDeHoy` solo compara la fecha con las ventanas de los carteles.** Calcula el día y la hora con `Intl` y `America/Merida`. Se comprobó en el emulador, que estaba en UTC.
- **Prioridad cuando hay dos rutas:** ventana abierta, luego la que falta hoy, y por último la próxima. Si dos rutas comparten ventana, como Avenida Nardos, se muestran ambas.
- **"Por confirmar" sigue a la ventana mencionada,** no al lugar: Renovación VII lo muestra jueves y sábado, y también al anunciar esos días, pero no el martes.
- **Encabezado desplazable, buscador fijo.** Con encabezado y aviso fijos, en 720×1280 con letra al 130 % solo quedaba un tercio de la pantalla para el contenido. Por eso inicio usa un solo `ScrollView` y la búsqueda dejó de usar `FlatList`: son 120 lugares como máximo.
- **Aviso de no oficial en una línea fija al pie.** El texto completo sigue en Rutas, en el mapa y en la pestaña Horario.
- **"Mapa de la ciudad" aparece desactivado** con la leyenda "Próximamente" hasta la etapa 3.
- **El camarón se usa solo mediante `componentes/Mascota.tsx`,** con la imagen ya recortada del ícono. Sus derechos siguen sin confirmar.
- **Probar fechas en el emulador:** `adb shell settings put global auto_time 0` y `adb shell cmd alarm set-time <milisegundos>`. Al terminar hay que devolver `auto_time` a 1.

## 2026-11-06 · Presencia visual, etapa 2: barra inferior

- **`Tabs` de `expo-router`,** que en la versión 58 trae integradas las pestañas. Solo usa `react-native-screens` y `safe-area-context`, así que no agrega módulos nativos ni depende de `reanimated` o `gesture-handler`, y no hubo que recompilar.
- **Grupo `(tabs)` dentro del `Stack` raíz.** `lugar/[id]`, `rutas` y `mapa/[rutaId]` quedan fuera del grupo para abrirse sobre la barra: así el mapa de ruta sigue a pantalla completa y la barra no tapa el panel.
- **`/mapa` es la pestaña y `/mapa/[rutaId]` el mapa de una ruta.** No chocan, pero son pantallas distintas.
- **Atrás:** desde cualquier pestaña vuelve a Inicio y, desde Inicio, sale de la app (`backBehavior="initialRoute"`).
- **La barra se oculta con el teclado** para dejar espacio a los resultados de búsqueda.
- **Mapa, Reportes y Avisos usan `PantallaVacia`** hasta sus etapas, sin datos de ejemplo. Reportes ya aclara que no se enviarán a nadie.
- **La tarjeta "Mapa de la ciudad" del inicio sigue desactivada** hasta la etapa 3, porque hoy solo llevaría a la pantalla vacía.
- **Advertencia de navegación:** "multiple navigation containers" aparece al forzar enlaces directos o cambiar el tamaño de pantalla con `adb`, porque se recrea la actividad. No apareció en el arranque normal.

## 2026-11-06 · Presencia visual, etapa 3: mapa de la ciudad

- **Solo escenario `carteles`.** `TRAZADOS_CIUDAD` se arma con `trazadoDeRuta`, y una prueba compara cada línea con el trazado original.
- **Una sola fuente para las 15 rutas.** Filtrar cambia la expresión `filter` de las capas, no los datos. Son tres capas sobre esa fuente: borde blanco, matutino y vespertino.
- **El turno se distingue por el trazo:** continuo en matutino y punteado en vespertino. El color identifica el número de ruta, y la Ruta 1 conserva su color en ambos turnos.
- **Paleta buscada por computadora.** La primera propuesta confundía las rutas 2 y 5 con deuteranopia (distancia 4.8). La actual tiene una distancia mínima de 33.1 entre los 8 colores en visión normal, protanopia, deuteranopia y tritanopia, con matrices de Machado 2009 y CIE76. Una prueba exige contraste de 3:1 con el mapa claro.
- **Sin etiquetas de texto sobre el mapa:** requerirían un servidor de tipografías externo. La ruta se identifica con la tarjeta y las pastillas, que usan número e icono de turno además del color.
- **Rutas superpuestas:** varias comparten avenidas, así que un toque puede alcanzar varias. La tarjeta muestra la primera y ofrece las demás en "También aquí".
- **Mapa base atenuado sin cambiar de proveedor:** `raster-saturation` -0.3, `raster-contrast` -0.08 y `raster-brightness-min` 0.05. Se aplica también al mapa de cada ruta. La primera versión (-0.7, -0.2 y 0.15) se veía demasiado descolorida para el usuario.
- **Sin conexión:** MapLibre no avisa cuando fallan los mosaicos, así que al entrar se hace un `HEAD` a un mosaico de la isla, con límite de 6 segundos. El aviso ofrece ver los horarios y reintentar. Solo está en la pestaña Mapa, no en el mapa de cada ruta.
- **Tarjeta con altura máxima del 42 %:** con letra al 130 % en 720×1280 tapaba el mapa y los filtros. El texto se desplaza por dentro y "Ver esta ruta" queda fija.
- **Fluidez sin medir de forma fiable:** `gfxinfo` no incluye el dibujo del mapa, que va por OpenGL. Falta confirmarla en un teléfono real.

## 2026-11-06 · Presencia visual, etapa 4: lista de rutas con silueta

- **Sin `react-native-svg`.** Las siluetas se dibujan con vistas giradas. Evalué el paquete y no se instaló: agrega código nativo con C++, que es lo que dio problemas de rutas largas en Windows, y obligaría a recompilar solo para dibujar una línea.
- **`siluetaDeRuta` vive en `compartido`.** Proyecta el trazado `carteles`, lo simplifica con Douglas-Peucker a menos de 40 segmentos y respeta la proporción real.
- **Sin forma cuando la geometría no alcanza:** menos de 2 lugares ubicados o menos de 1 km de línea. Solo aplica a la V5 (0.3 km y 1 de 5 lugares), que muestra "Sin forma" y explica por qué.
- **Etiquetadas como ilustrativas:** la lista avisa que no indican el sentido ni el orden del recorrido, y cada tarjeta muestra cuántos lugares están ubicados.
- **Mismo color que en el mapa de la ciudad,** para que una ruta se reconozca en ambas pantallas.
- **Fluidez:** se comparó el desplazamiento con y sin siluetas y dio casi igual (36 y 38 cuadros, 250 ms), con el emulador muy cargado y en modo de desarrollo. Las siluetas no son la causa de la lentitud, pero falta medirlo en un teléfono real.
- **El emulador reinició su sistema Android una vez durante las pruebas** (`DeadSystemException`). No venía de la app, y no se repitió.

## 2026-11-06 · Rendimiento del camión simulado

- **Se probó y se descartó dibujarlo como capa del mapa.** El usuario notó lag, y el camión consumía 40-77 % de CPU contra 4-5 % en reposo. Mi hipótesis era que moverlo dentro del mapa costaría menos, pero subió a cerca de 100 %: el hilo de dibujo pasó de unos 50 % a 83 %, porque cada paso redibuja el mapa completo.
- **Bajar la frecuencia tampoco sirve:** de 20 a 10 actualizaciones por segundo solo bajó de 72-76 % a 66-70 %, así que el coste no depende de las actualizaciones. Se conserva el `Marker` original.
- **Son medidas en emulador y modo de desarrollo.** Falta medir en un teléfono real. En reposo la app usa 4-5 % en todas las pantallas.

## 2026-11-06 · Presencia visual, etapa 5: lugares, recordatorios y bienvenida

- **Varios lugares:** `estado/guardados.tsx` reemplaza a `estado/favorita.tsx`. El lugar anterior se migra como "Casa" sin perderlo, y quien ya tenía uno no pasa por la bienvenida. La migración está probada con pruebas automáticas, no en el emulador.
- **Recordatorios con fecha absoluta, no semanales.** Un disparador semanal usaría la zona del teléfono; así se respeta `America/Merida`. Se programan 28 días y se reprograma cada vez que se abre la app, de modo que dejan de llegar si no se abre en ese plazo.
- **Sin duplicados:** cada cambio cancela todo y vuelve a programar. Dos rutas en la misma ventana dan un solo aviso.
- **Alarmas no exactas, con el texto ajustado.** En Android 13, sin `SCHEDULE_EXACT_ALARM`, el sistema puede entregar hasta 1 hora después. No se pide ese permiso, que exige un paso en ajustes y que Play limita a apps de alarmas y calendario. Por eso la app dice "después de las 20:00" y avisa con una hora de anticipación: aun retrasado, llega antes de que abra la ventana.
- **El permiso se pide al activar un recordatorio** y, si se niega, la app sigue funcionando y lo explica.
- **`expo-notifications` es nativo:** obligó a recompilar y a reiniciar Metro, porque el Metro anterior no resolvía el paquete. `npm audit` pasó de 5 a 6 alertas moderadas; no se corrigen por la razón ya registrada.
- **Compartir** usa `Share` de React Native e incluye que la app no es oficial.
- **Bienvenida de 3 pasos, solo la primera vez y omitible.** "Omitir" va a la izquierda porque en el development build la rueda de desarrollo tapa la esquina derecha.
- **Sin probar:** que los recordatorios sobrevivan a reiniciar el teléfono.
- **Pruebas con `wm size`:** cambiar el tamaño puede tumbar el lanzador de Android (`Position exceeds the bound of this CellLayout`). No viene de la app.

## 2026-11-06 · Presencia visual, etapa 6: reportes y avisos de demostración

- **Sin Supabase, por decisión del usuario.** Se interpretó "no manejaremos frontend" como backend, porque esta etapa es de front con datos locales.
- **Interfaces en `compartido`:** `ServicioSesion`, `ServicioReportes` y `ServicioAvisos`, con implementación local sobre un `Almacen`. Las pantallas solo usan `estado/demo.tsx`: para conectar el backend se cambia la implementación ahí.
- **Acceso simulado sin datos personales:** un botón, sin nombre, correo ni contraseña. Antes se muestra el borrador del aviso de privacidad, señalado como pendiente de revisión legal; el responsable queda como pendiente de definir.
- **Sin `expo-location`.** Un punto se marca tocando el mapa, y "ubicación" es un lugar del catálogo, así que no se pide permiso de ubicación.
- **Tiradero exige foto; acumulación no.** Es lo que indica el prompt.
- **Fotos con `expo-image-picker` y `expo-file-system`,** ambos nativos, lo que obligó a recompilar. Se copian a la carpeta privada de la app, no aparecen en la galería y se borran al borrar los datos. La cámara pide permiso al usarla.
- **Seguimiento simulado:** como nadie atiende los reportes, unos botones "Solo para la demostración" avanzan los estados. Las notas dicen que son de ejemplo y que nadie recibió el reporte, sin mencionar al municipio ni a SOS. "Recibido" se explica como "Guardado en este teléfono".
- **"Guardar reporte de demostración",** no "Enviar", para no sugerir que sale del teléfono.
- **Avisos de ejemplo:** cada tarjeta lleva la etiqueta "Ejemplo" y dice que no es real. No requieren sesión.
- **Probado en modo avión.** Sin conexión el mapa base muestra solo los mosaicos en caché; en esa prueba estaban todos, así que falta ver un teléfono sin caché.
- **Sin probar:** elegir foto de la galería, porque el emulador no tiene fotos y el selector es del sistema.

## 2026-11-06 · Presencia visual, etapa 7: detalles finales

- **Auditoría antes de retocar:** se quitaron los colores sueltos de las pantallas y se unificaron márgenes (`CONTENIDO`) y estilos de texto repetidos (`TEXTO.enlace`, `destacado`, `alerta`, `campo` y `pequeno`).
- **Áreas táctiles a 48 px (`ALTURA_TACTIL`):** pastillas (40), pestañas y botones flotantes (46) y el enlace del detalle (44). El asa del panel usa `hitSlop` para no cambiar su altura.
- **Inicio ya no parpadea:** antes mostraba la invitación un instante, aunque hubiera un lugar guardado. Inicio y Reportes usan `Esqueleto` mientras cargan.
- **Transiciones con `Animated` y controlador nativo:** deslizamiento entre pantallas, fundido entre pestañas y entrada suave de tarjetas (`Aparecer`).
- **Camión decorativo:** solo en los estados "Hoy" y "Ahora". Rebota en su lugar unos 1.3 segundos y se detiene: no recorre nada para no sugerir una posición real, y no consume CPU en reposo (4.7 % en inicio).
- **Reducir animaciones:** `useReducirAnimacion` lee la preferencia del teléfono y quita las animaciones. Se comprobó que la app funciona con las animaciones desactivadas, no la ausencia visual de cada una.
- **Capturas en `docs/capturas/`:** 13 pantallas a la mitad de resolución (2.9 MB). Son del development build, por eso aparece la rueda de desarrollo. Los datos son de prueba y la fecha es simulada.

## 2026-11-06 · Imagen del camión simulado

- **Excepción autorizada por el usuario a la regla de identidad visual:** el camión simulado lleva los logos de SOS de la Isla, el mural y el lema. El usuario confirmó que el camión y el camarón son diseños propios y pidió mantener los logos. La regla de `CLAUDE.md` sigue vigente para todo lo demás.
- **Armado de la imagen:** colores de la captura original y recorte de la versión vectorizada, para conservar los logos nítidos sin el fondo de arena.
- **Se probó primero una versión con caja lisa** y se descartó al recibir la autorización.
- **Al ir hacia el este la imagen se voltea,** así que el texto del camión queda en espejo. A su tamaño en el mapa casi no se lee. Corregirlo exige una segunda imagen.
- **La app sigue diciendo que no es oficial** y el marcador conserva la etiqueta "Simulación".
- **Consumo con el camión activo:** 41-57 % en emulador, dentro del rango del icono anterior; 4 % en reposo.

## 2026-11-09 · Fase 1: base de datos

- **Supabase en la nube, plan gratis.** No hay Docker y el disco está al 91 %. Las migraciones se aplican con `npx supabase db push --remote`; el CLI se vinculó con `supabase link` en una terminal aparte, sin guardar la contraseña en el repositorio.
- **Las migraciones originales se reescribieron** (nunca se habían ejecutado): `0001` a `0004` crean el esquema completo. `0005` a `0007` son correcciones encontradas al aplicar y probar.
- **Escenarios:** `tramos_ruta`, `paradas_ruta` y `recorridos_ruta` tienen columna `escenario`. `rutas` existe una sola vez y ambos escenarios cuelgan de ella. La RLS solo deja ver `propuesta` a administración, y `trazado('propuesta')` falla para el público en vez de devolver una lista vacía.
- **Seed único:** `herramientas/rutas/scripts/generar-seed.ts` escribe `supabase/seed.sql` desde los carteles, el catálogo de `compartido` y `salida/*.geojson`. `generar-salidas.ts` y `generar-cobertura.ts` ya no escriben SQL (lo hacían en una carpeta equivocada).
- **Ubicación de lugares:** la del punto con mejor confianza. Siete lugares comparten referencia OSM con otro de su ruta (Los Arcos 2, Libertad 2, Héroe de Nacozari 1, Esperanza 2, Priv. San Joaquín, Santa Rita 2 y 3) y el trazado les dejó un solo punto: comparten ese punto, no se inventó otro.
- **Confianza:** `horarios.confianza` guarda la de cada ruta; `lugares.confianza` la mejor de todas.
- **Valores de enums iguales a la app** (`noPaso`, `enRevision`), para no traducir entre capas.
- **Reportes:** un disparador fija estado inicial y nota, rechaza fechas futuras o de más de 30 días, fotos fuera de la carpeta del autor, reportes a nombre de otra persona y más de 10 reportes en 24 horas. Agrupa los "no pasó" iguales en `incidencias`. Solo administración cambia estado (Recibido → En revisión → Atendido o Rechazado), siempre con nota nueva, y cada cambio queda en `historial_reportes`.
- **Roles:** toda cuenta nace `ciudadano`. El primer administrador se asigna desde la base. `es_admin()` es `security definer` y queda expuesta por RPC: el revisor de Supabase lo marca, pero solo responde sobre quien pregunta y las políticas la necesitan.
- **Dispositivos:** por ahora exigen cuenta. Falta decidir si los avisos push funcionan sin cuenta (sesión anónima de Supabase) antes de la Fase 5.
- **Pendiente de rendimiento sin impacto real:** el revisor sugiere separar las políticas de administración por acción para no evaluar dos políticas en cada lectura. Con tablas de cientos de filas no se nota.
- **No probado:** `supabase db reset --linked` (borra la base remota). La base se creó con `db push --include-seed` sobre un proyecto vacío.

## 2026-11-09 · Conexión de la app y el panel a Supabase

- **Un solo `.env` en la raíz.** El panel lo lee con `envDir: '../..'`. Expo solo lee el `.env` de `apps/movil`, así que `npm run movil` y `npm run android` arrancan el CLI de Expo con `node --env-file-if-exists=../../.env`.
- **Traducción en `compartido/remoto.ts`,** sin depender de supabase-js. Una prueba comprueba que las filas de Supabase reproducen exactamente el catálogo incluido en la app.
- **Catálogo de la app:** arranca con el último catálogo descargado o, si no hay, con el incluido, y nunca espera a la red. El nuevo se descarga en segundo plano y se aplica en el siguiente arranque, para que una pantalla abierta no vea cambiar sus lugares. Un catálogo vacío o dañado se descarta.
- **`reemplazarCatalogo` cambia `LUGARES` y `RUTAS` en el mismo arreglo.** Así las pantallas no cambian. Es estado global a propósito; si crece, conviene pasarlo a un contexto.
- **El trazado (geometría) de la app sigue incluido en la app.** Es igual al de Supabase y pesa; se conecta cuando haya edición de trazos.
- **Avisos:** la app muestra los publicados y vigentes, con estado vacío y sin conexión, y dice que los publica el equipo del proyecto, no una autoridad. Se consultan al entrar a la pestaña. Sin Supabase configurado vuelven los de ejemplo.
- **Panel:** inicio de sesión con correo y contraseña. Tras entrar pide `es_admin()`; una cuenta ciudadana ve un mensaje y no carga datos. Rutas, resumen y unidades vienen de Supabase y las unidades muestran placas y estado.
- **La propuesta ya no es un archivo público.** `apps/panel/public/datos/propuesta.geojson` se borró: cualquiera podía descargarlo al publicar el panel. Ahora el panel la pide con `trazado('propuesta')`, que la RLS reserva a administración. `escenarios.json` (solo cifras) sigue siendo estático.
- **Reportes y sesión de la app siguen en modo demostración** hasta la Fase 4.

## 2026-11-09 · Correcciones tras recorrer los flujos de la app

- **Tarjeta de Inicio:** mostraba los días de todas las rutas del lugar bajo la etiqueta de una sola (Bivalvo: "Ruta 2" con martes, jueves y sábado). Ahora hay una fila por ruta con sus propios días y un botón de mapa por cada ruta ubicada.
- **"El camión no pasó":** solo ofrece y acepta días con recolección en ese lugar según el cartel. Hoy cuenta cuando ya terminó alguna de sus ventanas. Las fechas aparecen después de elegir el lugar y se borran al cambiarlo. La base aplica la misma regla de días (`0009`), aunque no la de la ventana de hoy.

## 2026-11-09 · Avisos desde el panel, con imagen

- **Pedido del usuario:** publicar imágenes junto con los avisos. Se agregó como parte de la gestión de avisos.
- **Bucket privado `avisos-imagenes` (0010).** La imagen de un aviso publicado la puede leer cualquiera; la de un borrador, solo administración. Así un aviso sin publicar no se filtra por su imagen. Solo administración sube, cambia o borra. Límite de 5 MB; JPG, PNG o WebP.
- **Descripción obligatoria** para cada imagen, en la base y en el formulario. Al cambiar de imagen se vacía, para no dejar la descripción de la anterior.
- **La app muestra la imagen completa,** con su proporción original (los avisos suelen ser carteles verticales), y pide URLs firmadas por una hora. Si fallan, el aviso se muestra sin imagen.
- **Lugares afectados:** el panel los elige con búsqueda; sin lugares, el aviso es para toda la ciudad. La app los muestra bajo cada aviso.
- **Fechas del panel en hora de Mérida,** sin importar la zona de la computadora (probado con la zona de Tokio).
- **Eliminar pide confirmación en la misma tarjeta,** sin ventanas emergentes del navegador. Al eliminar o reemplazar, la imagen anterior se borra después de guardar, y una imagen subida para un aviso que no se pudo guardar también se borra.
- **Corrección:** Supabase repite el evento de inicio de sesión al volver a la pestaña, y el panel recargaba todo, perdiendo un aviso a medio escribir. Ahora solo recarga si cambia la persona.
- **Imágenes de SOS de la Isla en avisos: autorizadas.** El usuario indicó que tienen autorización para usarlas. Es la segunda excepción a la regla de identidad visual de `CLAUDE.md`, junto con el camión simulado. La app sigue diciendo que no es oficial y que los avisos los publica el equipo del proyecto.

## 2026-11-10 · Fase 4: reportes reales

- **Inicio de sesión con correo y contraseña** (elección del usuario). No depende de que lleguen correos para entrar; mínimo 8 caracteres.
- **Confirmación de correo activa** (el usuario prefirió mantenerla). El enlace confirma la cuenta en Supabase y luego redirige a la "Site URL", hoy `localhost`, que no carga. Pendiente: apagarla o publicar una página de "cuenta confirmada".
- **Aviso de privacidad antes de pedir datos.** Para crear cuenta primero se acepta el aviso. La versión aceptada queda en `perfiles.privacidad_version` mediante `aceptar_privacidad()`, y la política de inserción de `reportes` exige haberla aceptado. Si el registro necesita confirmar el correo no hay sesión: el aviso se vuelve a pedir al iniciar sesión. Cambiar `VERSION_AVISO_PRIVACIDAD` obliga a aceptarlo de nuevo.
- **El aviso sigue siendo borrador:** responsable, domicilio y contacto están pendientes de definir.
- **Vista `reportes_detalle`** (`security_invoker`): da longitud y latitud y respeta la RLS. La app inserta la ubicación como EWKT.
- **Fotos:** se suben a `fotos-reportes/<usuario>/<marca de tiempo>.jpg`, de hasta 5 MB. Si el reporte no se guarda, la foto se borra. Al enviarlo, se borra la copia local. Se muestran con URL firmada por una hora y sin recortar.
- **Eliminar cuenta:** la app borra primero las fotos (política "borrar propias") y luego llama a `eliminar_mi_cuenta()`, que borra el usuario y, en cascada, perfil, reportes e historial. Una cuenta de administración no se elimina desde la app.
- **Se quitaron la sesión y los reportes locales de la demostración** (`estado/demo.tsx` y los servicios locales de `compartido`).
- **Panel:** la sección Reportes muestra a cada persona con un identificador corto, sin correo. Las incidencias se agrupan con los reportes ya cargados (hasta 500).
- **Pruebas de RLS:** ya no dependen de los avisos ni reportes reales; cuentan solo los datos que crea la prueba. Son 74 comprobaciones.
- **Probado en el emulador:** registro, confirmación, inicio de sesión, aceptación del aviso, acumulación con foto, cambio de estado desde el panel y que el vecino ve el nuevo estado y la nota.
- **No probado con datos reales:** dos "no pasó" de distintas personas formando una incidencia, otro usuario sin acceso a la foto, y eliminar la cuenta. Las tres reglas sí están cubiertas por las pruebas de RLS.
- **Pendiente:** "Olvidé mi contraseña" (requiere editar la plantilla de correo de Supabase).

## 2026-11-10 · Fase 3: edición en el panel

- **Horarios:** el panel edita los días y "por confirmar" de cada lugar en una ruta, quita un lugar de una ruta y agrega lugares existentes o nuevos. La ventana (inicio y fin) es la del turno y no se edita por lugar: la app muestra ventanas por turno.
- **Lugares nuevos:** se crean sin ubicación (`confianza = 'ninguna'`), con el id de `idLugar(nombre)`. Si el horario no se guarda, el lugar se borra. El horario de un lugar agregado a otra ruta también nace con `confianza = 'ninguna'`, porque no está en el trazado de esa ruta.
- **Un lugar sin horario se omite del catálogo de la app.** Antes invalidaba el catálogo descargado completo, y la app seguía con el anterior sin avisar. El panel advierte cuando se quita la última ruta de un lugar.
- **Unidades:** se editan placas, estado y nota. Siguen siendo ilustrativas.
- **Asignaciones:** cambiar la unidad de una ruta cierra la asignación vigente ayer y crea una que empieza hoy (`planAsignacion`). Si la vigente empezó hoy, se corrige en su lugar. El panel no deja que una unidad cubra dos rutas del mismo turno, y la base no deja que una ruta tenga dos unidades a la vez.
- **La app aplica el catálogo nuevo en el siguiente arranque,** no al instante, para que una pantalla abierta no cambie de golpe.
- **Pruebas de RLS:** ya no cuentan horarios ni asignaciones fijos (cambian al editar). Se agregaron comprobaciones de que un ciudadano no escribe en horarios, lugares, unidades ni asignaciones, y de que administración sí. Son 82 en total.
- **Probado en el emulador:** el usuario agregó el viernes a Bivalvo en V2 desde el panel, y la tarjeta de Inicio lo mostró tras reiniciar la app.

## 2026-11-10 · Fase 5: simulación y estadísticas

- **Sin avisos push** (decisión del usuario): no se usa Firebase. Quedan fuera los avisos push por lugar y la aceptación "un aviso llega solo a quienes siguen ese lugar". Los avisos se consultan en la pestaña Avisos, y los recordatorios locales de la app siguen igual, porque no necesitan Firebase. Las tablas `dispositivos` y `dispositivos_lugares` quedan sin usar.
- **El camión simulado avanza sobre el trazado de carteles**, no sobre la propuesta (decisión del usuario). El prompt pedía `recorridos_ruta` de la propuesta, pero el vecino ve el camión y la propuesta nunca se le muestra como su ruta. La línea es la misma de `trazado.generado.ts`, cargada en `recorridos_ruta` con escenario `carteles` desde el seed.
- **Lo mueve una función programada en Supabase** (decisión del usuario): `simular_camiones()` corre con `pg_cron` cada 10 segundos. Escribe una posición por unidad activa con asignación vigente, solo dentro de la ventana de su horario y en días con recolección según `horarios`. Da una vuelta completa a la ruta cada 30 minutos: es una velocidad de demostración y no sirve para estimar llegadas.
- **Límites de crecimiento:** las posiciones simuladas se borran a las 2 horas, y una segunda tarea borra cada día el historial de `pg_cron` de más de un día.
- **Tiempo real:** `posiciones_unidad` está en la publicación `supabase_realtime`. La app carga la última posición (de menos de 30 s) y escucha las nuevas; entre una y otra mueve el camión en línea recta. Si dejan de llegar posiciones, avisa que la simulación solo corre en la ventana de la ruta. Sin Supabase configurado sigue la simulación local.
- **Formato del punto:** la API REST entrega `geometry` como GeoJSON y el tiempo real como EWKB hexadecimal; `puntoDesdeGeometria` acepta ambos.
- **Los filtros de día del mapa** salen de los días reales de la ruta (`diasDeRuta`), no de la regla general del cartel. Se descubrió al agregar el viernes a Bivalvo desde el panel.
- **Estadísticas:** el cálculo vive en `compartido` (`calcularEstadisticas`), con pruebas, y usa los mismos reportes que la sección Reportes (hasta 1000). El tiempo de cierre es la mediana del envío a atendido o rechazado.
- **Mapa de calor:** `leaflet.heat` fijo en 0.2.0, porque la 1.0.0 se publicó una semana antes. Usa una sola gama de color. Cada reporte cuenta en su punto marcado o en la ubicación ilustrativa de su lugar; los de lugares sin ubicar se cuentan aparte.
- **Probado en el emulador:** el camión de V2 apareció y avanzó con posiciones de Supabase. **No probado en pantalla:** la página de Estadísticas (requiere la sesión del administrador). El panel compila con Vite.

## 2026-11-11 · Sitio web (presencia web)

- **Pedido del usuario:** un sitio para dar a conocer la app. La validación de las Fases 5 y 6 queda para la etapa de pruebas (QA).
- **Solo código por ahora:** `apps/web`, sin publicar. El hosting se decide después.
- **Sitio estático con Vite:** dos páginas HTML (`index.html` y `privacidad.html`) que no necesitan JavaScript. Al compilar, `contenido.ts` inserta los textos de `compartido` (no oficial, ventanas, horarios, trazado, reportes y aviso de privacidad), para que el sitio diga lo mismo que la app. Si falta un texto, la compilación se detiene.
- **Botón principal «Próximamente en Android»:** no hay APK todavía, y el sitio no pide datos.
- **Equipo y contacto:** pendientes; no se inventan. El sitio muestra "Pronto publicaremos…" hasta que se llenen `EQUIPO` y `CONTACTO` en `contenido.ts`.
- **No se usa la imagen del camión simulado con logos de SOS de la Isla:** la autorización fue para la app, y en un sitio de presentación podría sugerir que el proyecto es oficial. El sitio tampoco muestra la pestaña de avisos, porque incluye un cartel de SOS.
- **Capturas:** solo las tres que reflejan la app actual (inicio, horario y mapa). Las de seguimiento y avisos eran de la demostración anterior, con botones de "Simular" y avisos de ejemplo, y se quitaron. Faltan capturas nuevas tomadas con la APK y datos limpios; las actuales vienen del development build y muestran su rueda de desarrollo.
- **Figtree** se sirve desde el sitio con su licencia OFL, sin pedirla a Google.
- **No revisado:** la vista de teléfono en navegador (la ventana no cambió de tamaño durante la prueba). El escritorio sí se revisó.
- **Rediseño inspirado en Foldfolio (pedido del usuario):** se tomó la composición de la plantilla de Framer (nombre enorme detrás de un dispositivo, pantalla de bloqueo, recorrido al desplazarse, cifras grandes, mosaicos numerados y menú tipo píldora). Su código, textos e imágenes no se usan, porque la licencia es para usarla dentro de Framer. Como no hay un teléfono plegable, se dibujó un Android normal con CSS: en lugar de desplegarse, su pantalla pasa por bloqueo, inicio, horario y mapa.
- **La pantalla de bloqueo** muestra la hora real de Ciudad del Carmen y una notificación con el formato de los recordatorios de la app, marcada como "Ejemplo de recordatorio". Dice "tu colonia" para no afirmar que un lugar real tiene recolección ese día.
- **Las cifras** (15 rutas, 120 lugares, 95 en el mapa) salen del catálogo de `compartido` al compilar.
- **Anton 5.3.0** (OFL, `@fontsource`, versión fija) para los rótulos. Funciona sin JavaScript y respeta "reducir movimiento". En pantallas angostas el nombre va arriba del teléfono. La vista de teléfono se revisó dentro de un marco de 390 px.
- **Descarga desde el sitio (pedido del usuario):** la app se distribuirá como APK descargable desde la web. Mientras no exista, el botón dice «Próximamente: descarga la APK aquí» y hay una sección «Descárgala aquí» (`#descargar`), enlazada desde el menú. Al tener la APK (Fase 6), basta con llenar `APK` en `apps/web/contenido.ts` con su dirección y versión: el botón se convierte en descarga real. La sección avisa que Android pedirá permitir la instalación y que solo se descargue desde este sitio. El usuario confirmó el 2026-11-11 que la app es gratuita; el sitio lo dice en la sección de descarga y en las preguntas.

## 2026-11-11 · Sitio en Vercel

- **Proyecto `carmen-limpio` en Vercel:** se configuró con Root Directory `apps/web` y rama de producción `presencia-web`, porque `main` aún no tiene el sitio. Vercel instala desde la raíz del monorepo, así que el sitio puede usar `compartido`. Dirección: https://carmen-limpio.vercel.app
- **Hallazgo:** el proyecto se había creado con Root Directory `apps/panel` sobre `main`. Eso publicaba el panel viejo de solo lectura, con `datos/propuesta.geojson` descargable por cualquiera, contra la regla de no mostrar la propuesta al público. Con el nuevo despliegue da 404. El despliegue anterior sigue existiendo, pero exige iniciar sesión en Vercel; se puede borrar si el usuario lo decide.
- **Cuando `main` se fusione,** hay que cambiar la rama de producción de Vercel de vuelta a `main`.

## 2026-11-11 · Revisión de datos antes de la APK

- **Base contra carteles:** se compararon en la base remota los 123 horarios, 120 lugares y 15 rutas con el seed generado desde `rutas.json`. La única diferencia era Bivalvo en V2 (martes, jueves y sábado, por una prueba en el panel); quedó en solo martes, como el cartel.
- **Datos de prueba:** se borraron el aviso «PRUEBA» con su imagen y el reporte «PRUEBA» con su foto. Se corrigió la ortografía del aviso de descacharrización.
- **Camión simulado:** todas las líneas de carteles pasan a menos de 150 m de sus lugares ubicados. La V5 tiene solo 1 de 5 lugares ubicados y su línea mide 309 m; se deja así hasta tener ubicaciones confiables, sin inventarlas.
- **Mapa de calor:** no se dibujaba. `leaflet.heat` se registra en la variable global `L`, y el módulo importado de leaflet no admite propiedades nuevas; ahora recibe una copia extensible. Además, el complemento atenúa cada punto a la mitad por nivel de zoom por debajo de 18, así que se fija `maxZoom` en el zoom de la ciudad para que un reporte se vea completo en esa vista.
- **Confirmación de correo:** el enlace regresaba a la Site URL de fábrica de Supabase (`localhost`). La app ahora pide volver a `https://carmen-limpio.vercel.app/confirmado.html` (`CONFIRMACION_CORREO` en `compartido`). Esa página del sitio dice que la cuenta quedó confirmada o que el enlace venció, y quita de la dirección la sesión que agrega Supabase, sin usarla. La dirección debe estar en Supabase, Authentication → URL Configuration → Redirect URLs.
- **Prueba de punta a punta (2026-11-12):** el registro de una cuenta llegó a «Tu cuenta quedó confirmada». Al iniciar sesión, la app pidió el aviso de privacidad y la aceptación quedó guardada. El ciclo reporte con foto → panel → seguimiento en la app funcionó. También se probó la app sin conexión (horarios, mapa, avisos y su recuperación) y el mensaje de contraseña equivocada.

## 2026-11-12 · Olvidé mi contraseña

- **Pedido del usuario, antes de la APK.** En Iniciar sesión hay un enlace «Olvidé mi contraseña». Abre una pantalla que pide el correo y llama a `resetPasswordForEmail`. La respuesta es la misma exista o no la cuenta, para no revelar qué correos están registrados.
- **La nueva contraseña se escribe en el sitio**, en `https://carmen-limpio.vercel.app/nueva-clave.html` (`NUEVA_CLAVE` en `compartido`), y no en la app. Así el enlace funciona aunque se abra en una computadora, y no depende de que Android abra la app desde el correo.
- **Cómo funciona la página:** toma la sesión temporal de la dirección (`type=recovery`), la quita de la barra de direcciones y del historial, y la guarda solo en memoria. Con ella cambia la contraseña por la API de Auth de Supabase y después cierra esa sesión. Si el enlace venció o ya se usó, dice «Este enlace ya no sirve». Usa solo la clave `anon`, de `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- **Para que funcione publicado:** la dirección debe estar en Supabase, Authentication → URL Configuration → Redirect URLs, y las dos variables `VITE_` deben estar en el proyecto de Vercel. El correo usa la plantilla de Supabase en inglés (el usuario lo aceptó) y cuenta para el mismo límite de unos 2 correos por hora mientras no haya SMTP propio.

## 2026-11-12 · Firma de la APK

- **Clave propia, compilación local (decisión del usuario).** La APK de release se firma con una clave del proyecto, nunca con la de depuración que Expo genera en `apps/movil/android/`. Esa carpeta se regenera, así que el cambio está en el plugin `apps/movil/plugins/firma-propia.js`.
- **La clave no está en el repositorio.** El archivo `.jks` se guarda en `C:\Users\Gustavo\.carmen-limpio\`, y su ubicación, alias y contraseñas en `~/.gradle/gradle.properties`, con las variables `CARMEN_UPLOAD_STORE_FILE`, `CARMEN_UPLOAD_STORE_PASSWORD`, `CARMEN_UPLOAD_KEY_ALIAS` y `CARMEN_UPLOAD_KEY_PASSWORD`. El usuario guarda un respaldo de la clave y de su contraseña. Si se pierden, ninguna actualización se instala sobre la APK ya distribuida.
- **Sin la clave, el release no compila.** Se detiene con «Falta la clave de firma», en lugar de producir una APK sin firmar. El development build no cambia.
- **Permisos de la APK:** las librerías agregaban permisos que la app no usa. Se quitan con `blockedPermissions` en `app.json`: ubicación precisa y aproximada (la agrega MapLibre, y el aviso de privacidad dice que no se usa el GPS), micrófono (lo agrega el selector de fotos, para video), mostrar sobre otras apps (resto del modo de desarrollo) y la recepción de push de Google (no hay avisos push). Quedan la cámara, las notificaciones locales e internet. En el emulador, el mapa funciona igual sin el permiso de ubicación.
- **Tamaño:** con los cuatro tipos de procesador, la APK pesa unos 125 MB. La que se publica lleva solo los de teléfono (`-PreactNativeArchitectures=arm64-v8a,armeabi-v7a`), alrededor de 67 MB. El emulador x86_64 no ejecuta esa versión, así que se prueba en la completa y la de teléfonos se revisa en un teléfono real.
