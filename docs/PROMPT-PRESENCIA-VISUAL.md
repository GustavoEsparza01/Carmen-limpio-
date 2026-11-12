# Carmen Limpio: prompt de presencia visual

Trabaja en la rama `presencia-visual`. El objetivo es que la app deje de sentirse simple y que, desde que se abre, se vea como un producto completo y útil. **Esta etapa es solo de front: el backend queda para después.**

Antes de empezar, lee `CLAUDE.md` y `docs/decisiones.md`. Sus reglas siguen vigentes. Si algo aquí las contradice, detente y pregunta.

## 1. Estado actual

Compruébalo antes de actuar y avísame si encuentras diferencias.

**Ya existe:**
- App: búsqueda, detalle de lugar, lista de rutas, mapa por ruta con panel deslizable y filtro por día, y camión simulado.
- Tema propio en `apps/movil/estilos/tema.ts` y componentes en `apps/movil/componentes/ui.tsx`.
- Panel web de consulta, con comparación de escenarios.
- Git y GitHub. La rama `presencia-visual` parte de `simulacion-camion`, que todavía no está en `main`.

**Falta:** tarjeta del día, recordatorios, reportes y avisos.

**Problemas visuales detectados en el emulador:**
- Más de la mitad del inicio está vacía, y su elemento más llamativo es el aviso de "no oficial".
- La app no da información útil hasta que se busca una colonia.
- No hay barra inferior.
- La lista de rutas son ocho filas casi iguales.
- El mapa base compite con la línea de la ruta.

## 2. Cómo trabajar

- Haz una etapa a la vez. Al terminar cada una, muestra capturas del emulador, qué probaste y qué falta, y espera mi visto bueno.
- Haz commits pequeños en español. Sin `push`, PR ni fusión sin pedirlo.
- Pon la lógica en `packages/compartido`, con pruebas.
- Reutiliza `tema.ts` y `ui.tsx`. Agrega ahí lo que falte, sin colores ni tamaños sueltos en las pantallas.
- Instala paquetes con `npx expo install` desde `apps/movil`, consultando la documentación de la versión instalada. Si una dependencia es nativa, avísame que hay que recompilar.
- **No uses `react-native-reanimated` ni `react-native-gesture-handler`:** están excluidos por el límite de rutas de Windows. Usa `Animated` y `PanResponder`.
- Registra las decisiones en `docs/decisiones.md`.

**Criterios en cada pantalla:**
- Contraste AA o superior.
- Áreas táctiles de 48 px o más.
- Etiquetas de accesibilidad.
- Prueba en 720×1280 con letra al 130 %, y en el Pixel 8 Pro del emulador.

**Reglas que no cambian:**
- Muestra ventanas, nunca una hora exacta de llegada.
- No afirmes que el camión pasó, va a pasar a cierta hora o está cerca.
- La app sigue diciendo que no es oficial.
- Todo trazado sigue etiquetado como ilustrativo, y OpenStreetMap sigue con atribución.
- Nunca uses datos de `propuesta` en la app.

## Etapa 1. Inicio con tarjeta "Hoy"

Crea en `compartido` una función pura que reciba la fecha y los horarios de un lugar y devuelva su estado. Usa siempre `America/Merida`, sin depender de la zona del teléfono.

| Estado | Mensaje de ejemplo |
|---|---|
| Hoy, antes de la ventana | Hoy toca recolección, de 15:00 a 23:00 |
| Hoy, dentro de la ventana | Recolección en curso, hasta las 23:00 |
| Hoy, ventana terminada | La ventana de hoy terminó. Próxima: jueves |
| Otro día | Próxima recolección: martes, de 7:00 a 15:00 |

- Contempla los lugares con dos rutas, las excepciones de días y la marca "por confirmar".
- Prueba cada estado, el cambio de día y la zona horaria.

**Rediseña el inicio:**
- Tarjeta grande arriba, cuyo color cambie según el estado, con la semana en círculos (`DiasSemana`) y acceso a su mapa.
- Sin lugar guardado, muestra una invitación clara a elegir colonia, no un espacio vacío.
- Agrega accesos visuales a Rutas y Mapa de la ciudad.
- Conserva el aviso de no oficial, más discreto y siempre visible en el inicio.
- Texto y color deben comunicar lo mismo: el estado no puede depender solo del color.

**Aceptación:** con un lugar guardado, el inicio responde al abrir si hoy toca. Sin lugar guardado, no se ve vacío.

## Etapa 2. Barra inferior

Agrega cuatro pestañas con Expo Router: **Inicio, Mapa, Reportes y Avisos**.

- Conserva la navegación actual hacia detalle, rutas y mapa de ruta, y que el botón Atrás funcione bien.
- Mantén visible la pantalla de mapa de ruta a pantalla completa, sin que la barra tape el panel.
- Reportes y Avisos serán pantallas vacías bien diseñadas hasta sus etapas. No uses datos falsos sin etiquetar.

**Aceptación:** todo lo que funcionaba sigue funcionando, y puedo moverme entre las cuatro secciones.

## Etapa 3. Mapa de la ciudad

- La pestaña Mapa muestra las 15 rutas del escenario `carteles` con `trazadoDeRuta`.
- Filtros por turno y por ruta. Al tocar una línea, muestra su tarjeta y el acceso a `mapa/[rutaId]`.
- Colores distinguibles entre rutas, pensados también para daltonismo, sin depender solo del color.
- Mantén "Trazado ilustrativo" y la atribución de OpenStreetMap siempre visibles.
- **Mapa base:** primero prueba bajar saturación y contraste con las propiedades `raster-*` de MapLibre, sin cambiar de proveedor. Si propones otro mapa base, revisa antes su licencia y sus límites de uso, y pregúntame.
- Vigila el rendimiento: agrupa los trazados en una sola fuente y no dibujes 15 componentes pesados.
- Si no hay internet, muestra un mensaje claro y deja el horario disponible.

**Aceptación:** puedo ver toda la ciudad, filtrar por turno y abrir una ruta desde el mapa, con fluidez en el emulador.

## Etapa 4. Lista de rutas con personalidad

- Cada tarjeta lleva la silueta de su recorrido, dibujada desde el trazado `carteles`, con número, turno y cantidad de lugares.
- Las rutas sin geometría suficiente (como V5) muestran un estado claro y no una forma engañosa.
- Calcula la silueta en `compartido`, con pruebas.
- Evalúa `react-native-svg`. Si se instala, confirma que compila en Windows.

**Aceptación:** las rutas se distinguen a simple vista, y la lista mantiene su fluidez.

## Etapa 5. Varios lugares, recordatorios y bienvenida

- **Lugares:** permite guardar casa, trabajo u otros, migrando el lugar actual sin perderlo. La tarjeta "Hoy" debe funcionar para cada uno.
- **Recordatorios locales** con `expo-notifications`, sin servidor:
  - Opcionales y por lugar, la noche anterior o antes de que abra la ventana.
  - Pide el permiso hasta que la persona active uno, y funciona si lo niega.
  - Reprograma al cambiar ajustes y evita duplicados.
- **Compartir horario** como texto con el menú nativo, incluyendo que la app no es oficial.
- **Bienvenida de tres pantallas**, solo la primera vez y omitible: elige tu colonia, activa un recordatorio y conoce qué es la app. La tercera aclara que no es oficial y que los horarios vienen de carteles.

**Aceptación:** una instalación nueva pasa por la bienvenida y termina con su lugar guardado. Un recordatorio de prueba llega en el emulador.

## Etapa 6. Reportes y avisos de demostración

Construye con datos locales, sin Supabase ni servicios externos.

1. Crea en `compartido` interfaces de datos (`reportes`, `avisos`, `sesion`) con una implementación local, para conectar el backend después sin rehacer pantallas.
2. Usa AsyncStorage.
3. Construye:
   - Acceso simulado y marcado como demostración, sin contraseñas ni datos reales.
   - Borrador de aviso de privacidad (LFPDPPP) antes de pedir datos, señalado como pendiente de revisión.
   - Formularios: "El camión no pasó" (colonia y fecha), "Acumulación de basura" (ubicación, descripción y foto opcional) y "Tiradero clandestino" (punto en el mapa, descripción y foto).
   - "Mis reportes" con línea de tiempo: Recibido → En revisión → Atendido o Rechazado, con nota.
   - Avisos con tarjetas, etiquetados como ejemplo.
4. Di claramente que es una demostración y que el reporte **no se envía a nadie**. No sugieras que llega al municipio o a SOS.
5. Las fotos y ubicaciones se quedan en el dispositivo. Pide permisos hasta necesitarlos.

**Aceptación:** puedo crear los tres tipos de reporte y ver su línea de tiempo, sin internet ni credenciales.

## Etapa 7. Detalles finales

- Transiciones suaves y estados de carga con `Animated`.
- Un pequeño camión animado en la tarjeta "Hoy", decorativo y sin insinuar su posición real. Respeta la preferencia de reducir animaciones.
- Revisión general de espaciado, tipografía y consistencia.
- Capturas finales de cada pantalla en `docs/capturas/`.

**Aceptación:** la app se ve coherente en todas las pantallas y sigue pasando `npm run typecheck` y `npm test`.

## Mascota

El camarón da identidad, pero sus derechos están **sin confirmar** (ver "Logo del camarón" en `docs/decisiones.md`).

- Puedes usarlo en el inicio y la bienvenida para demostraciones, mediante **un solo componente**, para reemplazarlo fácilmente.
- No generes variantes ni expresiones nuevas a partir de esa imagen.
- Señala en tu resumen que debe resolverse antes de publicar.

## Fuera de alcance

No agregues backend, Supabase, notificaciones push, GPS real, hora de llegada, puntos o rankings, chat con IA, pagos, iOS, modo oscuro ni widget de Android. Tampoco cambies el panel web en esta etapa.

Los botones "Ya pasó el camión" y "Falta mi colonia" siguen sujetos a mi aprobación.

Al terminar estas etapas, **el criterio final del prototipo seguirá sin cumplirse**, porque la app y el panel no comparten datos sin backend. Dilo así en tus resúmenes.

## Primer mensaje que debes enviar

Antes de cambiar archivos:
1. Confirma que leíste este documento, `CLAUDE.md` y `docs/decisiones.md`.
2. Confirma que estás en la rama `presencia-visual`.
3. Ejecuta `npm run typecheck` y `npm test`, e informa el resultado.
4. Señala lo que no coincida con la sección 1.
5. Resume cómo harás la Etapa 1 y espera mi confirmación.
