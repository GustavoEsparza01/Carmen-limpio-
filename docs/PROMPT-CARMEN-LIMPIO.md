# Carmen Limpio: prompt maestro de desarrollo

Eres el agente de desarrollo de **Carmen Limpio**. Este documento contiene la idea, las decisiones tomadas, el estado actual y el plan. Léelo completo antes de actuar y trabaja siempre en español: conversación, documentación, interfaz y mensajes de commit.

## 0. Cómo debes trabajar

1. **El repositorio ya existe.** El usuario creó el repo en GitHub y la carpeta local, y conectó Git. No crees otro repositorio ni cambies el remoto.
2. **Empieza por la Fase 0** (sección 9) y avanza una fase a la vez. Al terminar cada una, muestra qué funciona, qué probaste y qué falta, y espera su visto bueno.
3. **Usa los recursos existentes.** La carpeta `recursos/` trae datos, scripts y SQL ya trabajados. No rehagas el trazado de rutas.
4. **No inventes datos operativos.** Si falta un dato real, márcalo como pendiente o ilustrativo.
5. **Respeta el alcance.** No agregues funciones fuera de la sección 5 sin preguntar.
6. **Git:** haz commits pequeños y descriptivos en una rama por fase. No hagas `push`, no abras PR y no fusiones a la rama principal sin pedirlo.
7. **Secretos:** las claves van en variables de entorno y nunca en el repositorio. Mantén un `.env.example` sin valores reales. La clave `service_role` de Supabase jamás llega a la app ni al panel.
8. **Verifica antes de afirmar.** Una fase está lista cuando sus criterios de aceptación se comprobaron de verdad. Si algo no se pudo probar, dilo.

## 1. La idea

Carmen Limpio es una plataforma para consultar y dar seguimiento a la recolección de residuos urbanos en Ciudad del Carmen, Campeche.

**Problema que atiende:**
- Falta información accesible sobre días y horarios de recolección.
- Se desconocen los recorridos de los camiones.
- Es difícil comunicar retrasos, incumplimientos o acumulación de basura.
- No hay un canal digital central para dar seguimiento a incidencias.

**Solución:** una app móvil para ciudadanos y un panel web para administradores, conectados a una base de datos central.

**Misión:** ofrecer una solución accesible para consultar, organizar y dar seguimiento al servicio de recolección.

**Visión:** ser una plataforma de referencia para la gestión inteligente de residuos urbanos en Ciudad del Carmen.

No pretende resolver toda la gestión municipal de residuos. En esta versión, lo "inteligente" es el análisis de incidencias; no prometas IA.

El documento original está en `recursos/docs/Carmen_Limpio_Documento_de_Presentacion.pdf`.

## 2. Reglas de producto

- **La app no es oficial.** Debe decirlo con claridad mientras no exista un convenio con el municipio o con la empresa.
- **Nombre:** el programa de los carteles se llama "Carmen siempre Limpio" y aparece junto al logo de SOS de la Isla. No uses sus logos ni su identidad visual.
- **Ventanas, no horas exactas:** muestra "martes, jueves y sábado, 7:00 a 15:00", nunca una hora precisa de llegada.
- **Zona horaria:** usa siempre `America/Merida`.
- **Datos ilustrativos:** todo trazado se etiqueta como ilustrativo hasta tener validación oficial.
- **Sin sesión:** consultar colonias, horarios, rutas y avisos no requiere cuenta. Reportar y dar seguimiento sí.
- **Privacidad:** agrega un aviso de privacidad (LFPDPPP) antes de pedir datos. Las fotos de reportes no son públicas, porque pueden mostrar rostros o placas.

## 3. Stack tecnológico (decisión cerrada)

| Parte | Tecnología |
|---|---|
| Lenguaje | TypeScript en todo el proyecto |
| App móvil | Expo (React Native), solo Android por ahora |
| Panel web | React con Vite y Leaflet |
| Backend | Supabase: PostgreSQL, PostGIS, Auth, Storage y Realtime |
| Notificaciones | Expo Notifications con Firebase para push; recordatorios locales en el dispositivo |
| Organización | Monorepo con npm workspaces |

- Instala versiones estables actuales y consulta la documentación vigente. No fijes versiones de memoria.
- Usa un *development build* de Expo desde el inicio, porque Expo Go no sirve para probar push en Android.
- **Mapa móvil:** usa `react-native-maps` si el usuario proporciona una clave de Google Maps. Si no, usa MapLibre con OpenStreetMap.
- **Mapa web:** Leaflet con OpenStreetMap, incluyendo siempre la atribución. Los mapas base del servidor público de OpenStreetMap son solo para el prototipo.
- No propongas otro stack salvo que el usuario lo pida. Sí debes avisar si una decisión resulta inviable.

## 4. Estructura del repositorio

```text
carmen-limpio/
├── apps/
│   ├── movil/               App ciudadana (Expo)
│   └── panel/               Panel web (React + Leaflet)
├── packages/
│   └── compartido/          Tipos, validaciones y constantes
├── supabase/                Migraciones y datos iniciales
├── herramientas/rutas/      Datos y scripts del trazado
├── docs/                    Documento original, carteles y decisiones
├── .env.example
├── README.md
└── CLAUDE.md
```

## 5. Alcance de la versión 1

**Incluye en la app:**
- Elegir colonia sin iniciar sesión y guardarla como favorita.
- Ver días, turno y ventana de recolección.
- Ver la ruta en el mapa, etiquetada como ilustrativa.
- Consultar avisos y recibir recordatorios.
- Crear reportes con cuenta y seguir su estado.

**Incluye en el panel:**
- Inicio de sesión de administradores.
- Administrar colonias, rutas, horarios, unidades, asignaciones y avisos.
- Revisar reportes y cambiar su estado con una nota.
- Estadísticas y mapa de calor de incidencias.
- Comparar los dos escenarios de rutas (sección 7).

**Demostración:** camión simulado, siempre etiquetado como simulación.

**Queda fuera:** GPS real, hora estimada de llegada, optimización con IA, sensores IoT, reportes anónimos e iOS.

## 6. Reportes

Cada tipo usa un formulario distinto:

| Tipo | Datos |
|---|---|
| El camión no pasó | Colonia y fecha |
| Acumulación de basura | Ubicación, descripción y foto opcional |
| Tiradero clandestino | Punto en el mapa, descripción y foto |

- **Estados:** Recibido → En revisión → Atendido o Rechazado, siempre con una nota visible para el ciudadano.
- **Historial:** cada cambio se registra en `historial_reportes`.
- **Agrupación:** varios "no pasó" de la misma colonia y fecha forman una sola incidencia, conservando a cada persona que reportó.
- **Abuso:** aplica límites razonables de envío por usuario.
- **Atención:** por ahora los reportes los atiende el equipo del proyecto como demo. No sugieras que llegan al municipio o a SOS.

## 7. Datos: lee esto con cuidado

### 7.1 Lo que dicen los carteles

Los carteles "Ubica tu ruta" están en `recursos/docs/carteles/` y su transcripción en `herramientas/rutas/data/rutas.json`.

- Días: martes, jueves y sábado.
- Turno matutino: 7:00 a 15:00, rutas 1 a 7 (`M1` a `M7`).
- Turno vespertino: 15:00 a 23:00, rutas 1 a 8 (`V1` a `V8`).
- En total son **15 recorridos, numerados del 1 al 8**, con 123 lugares.
- Excepciones de días:
  - San Joaquín: martes y jueves.
  - Bivalvo: V2 los martes; V3 jueves y sábado.
  - Renovación VII: V7 los martes. Que V1 la cubra jueves y sábado es una **deducción sin confirmar**.

Los datos vienen de carteles aportados por el usuario. No tienen validación formal.

### 7.2 Unidades

El usuario definió **8 vehículos, uno por número de ruta**:

| Unidad | Matutino | Vespertino |
|---|---|---|
| 1 a 7 | M1 a M7 | V1 a V7 |
| 8 | Sin ruta | V8 |

Que un mismo vehículo cubra ambos turnos es un **supuesto pendiente de confirmar**. Modélalo en `asignaciones` con fechas de vigencia, para cambiarlo sin migraciones. Placas y demás datos reales quedan vacíos o ilustrativos.

### 7.3 Dos escenarios de rutas: no los mezcles

| | Escenario `carteles` | Escenario `propuesta` |
|---|---|---|
| Archivos | `salida/rutas.geojson`, `salida/paradas.geojson` | `salida/cobertura.geojson`, `salida/recorridos.geojson` |
| Qué es | Corredor que une los lugares de cada ruta real | Diseño propio que cubre todas las calles |
| Cobertura | No pasa por todas las calles | 512 km, 9,466 tramos verificados |
| Uso | **App ciudadana** | **Panel y demostración** |

**Regla crítica:** los identificadores `M1`, `V1`, etc. **no significan lo mismo** en ambos escenarios. La zona `M1` de la propuesta no contiene las colonias de la ruta M1 del cartel. Nunca muestres geometría de `propuesta` a un ciudadano como si fuera su ruta.

**Horarios sin ubicación:** el horario de un lugar viene del cartel, no de sus coordenadas. Un lugar sin ubicar debe aparecer igual en la búsqueda con sus días y turno; solo le falta el mapa.

**Tipos de lugar:** no todos son colonias. Modela `tipo` con valores como `colonia`, `fraccionamiento`, `avenida`, `calle`, `privada` y `otro`.

### 7.4 Confianza de ubicación

De los 123 lugares: 54 alta, 31 media, 12 baja y 26 sin ubicar (`data/ubicaciones.json`).

Sin ubicar:
- **M2:** Puente de la Unidad
- **M3:** Ortiz Ávila, Tierra y Libertad, Potrero 1, Potrero 2
- **M6:** Villa del Mar, Encantada, Puerta de Hierro, Avenida Parque Central
- **V1:** Real del Carmen, Hacienda Dorada, Renovación VII
- **V2:** Mariscos, AFA, Rastro Municipal
- **V4:** 56, Ampliación 56, 10 de Julio
- **V5:** Reforma, Raíces, Lepavides, Colonia Reforma 57
- **V7:** Renovación VII
- **V8:** Bicentenario 1, 2 y 3

Conserva `confianza` en la base y refléjala en el panel. La lista completa para revisión está en `salida/validacion.csv`.

### 7.5 Limitaciones conocidas de la propuesta

- **Horas estimadas:** usan 6 km/h recolectando y 25 km/h en traslado, sin viajes al relleno, descargas ni descansos.
- **Zonas sobre 8 horas:** V4 (10), V6 (8.7), M5 (8.4) y V2 (8.1).
- **Salida común:** es un punto supuesto en la carretera 180. No es la base ni el relleno. Las fuentes ubican el relleno en esa carretera, sin coincidir en el kilómetro; la base no se ha localizado.
- **Sin modelar:** capacidad del camión, prohibiciones de giro, calles angostas y privadas con portón.
- **Fuera de la cobertura:** 6 km de andadores, 73 km de vías de servicio y 12 km al oriente de la zona urbana.
- **Ruta V5 del cartel:** solo tiene 1 de sus 5 lugares ubicado.
- **Rutas V1, V2 y V4 del cartel:** mezclan lugares muy alejados, posiblemente por nombres mal interpretados.

### 7.6 Fuentes externas

- Los datos viales vienen de OpenStreetMap (licencia ODbL). Conserva la atribución en mapas y documentación.
- **No extraigas datos automáticamente de `sosdelaisla.com`.** El usuario detuvo esa revisión. No la retomes sin su autorización.

## 8. Base de datos

### 8.1 Punto de partida

En `recursos/supabase/` hay dos migraciones y dos seeds generados. **Nunca se han ejecutado en PostGIS.** Pruébalos antes de confiar en ellos.

Corrección obligatoria: `seed.sql` y `seed-cobertura.sql` insertan las mismas rutas y son excluyentes. Agrega una columna `escenario` (`carteles` o `propuesta`) a las tablas de trazado, separa la tabla `rutas` de sus geometrías y crea un cargador que incluya ambos escenarios sin duplicar rutas.

### 8.2 Tablas

| Tabla | Contenido |
|---|---|
| `perfiles` | Usuario, rol (`ciudadano` o `administrador`) |
| `lugares` | Nombre, tipo, ubicación opcional, confianza |
| `rutas` | Turno, número y bandera `validada` |
| `horarios` | Lugar, ruta, días, ventana inicio y fin |
| `tramos_ruta` | Escenario, ruta, tipo de tramo, km, geometría |
| `recorridos_ruta` | Escenario, ruta y línea ordenada |
| `paradas_ruta` | Escenario, ruta, orden, lugar, confianza |
| `unidades` | Número, placas opcionales, estado |
| `asignaciones` | Unidad, ruta, vigencia desde y hasta |
| `avisos` | Texto, vigencia y lugares afectados |
| `incidencias` | Agrupación de reportes equivalentes |
| `reportes` | Tipo, autor, ubicación, foto, estado |
| `historial_reportes` | Cambios de estado con nota |
| `posiciones_unidad` | Unidad, punto, fecha y origen (`simulacion` o `gps`) |
| `dispositivos` | Token push y lugares seguidos |

`horarios` debe ligar lugar, ruta, día y turno, porque una ruta cubre varios lugares y las excepciones son por lugar.

### 8.3 Seguridad (RLS activa en todas las tablas)

- **Público:** lectura de lugares, rutas, horarios, avisos y trazados del escenario `carteles`.
- **Ciudadano:** crear y leer solo sus reportes.
- **Administrador:** gestión completa. El rol debe comprobarse en el servidor, nunca solo en la interfaz.
- **Fotos:** bucket privado con URLs firmadas.

Expón la geometría como GeoJSON mediante vistas o funciones con `ST_AsGeoJSON`. Agrega pruebas que confirmen estas reglas.

## 9. Plan de trabajo

### Fase 0. Preparación
- Revisa el repositorio y mueve los recursos a su lugar: `recursos/herramientas-rutas/` a `herramientas/rutas/`, `recursos/supabase/` a `supabase/` y `recursos/docs/` a `docs/`.
- Crea el monorepo, `README.md`, `.gitignore`, `.env.example` y `CLAUDE.md` con las reglas de este documento.
- Entrega al usuario la lista de cuentas que debe crear: Supabase, Expo, Firebase y, si aplica, Google Cloud. Las cuentas y claves las crea él.

**Aceptación:** `npm install` funciona, `apps/panel` arranca y `apps/movil` abre en un emulador o dispositivo Android.

### Fase 1. Base de datos y datos
- Prueba las migraciones, aplica la corrección de escenarios y crea el esquema completo con RLS.
- Carga rutas, lugares, horarios y las 8 unidades.

**Aceptación:**
- Una base limpia se crea con un solo comando.
- Hay 15 rutas, 123 entradas de lugares y 8 unidades, y `node scripts/verificar-cobertura.ts` sigue pasando desde `herramientas/rutas`.
- Las pruebas de RLS pasan.

### Fase 2. Consulta en la app
- Búsqueda de colonia, detalle con días y ventana, mapa, favorita y estado sin conexión con los últimos datos.

**Aceptación:** sin iniciar sesión, un usuario encuentra "Renovación 1" y ve su horario y ruta. Un lugar sin ubicar muestra su horario y explica que falta el mapa. Las excepciones de días se muestran bien.

### Fase 3. Panel administrativo
- Inicio de sesión, catálogos, unidades, asignaciones, avisos y comparación de escenarios.

**Aceptación:** un administrador cambia un horario y la app lo muestra. Un ciudadano no puede entrar al panel ni escribir en catálogos.

### Fase 4. Reportes
- Cuentas, aviso de privacidad, los tres formularios, foto, ubicación, seguimiento y gestión en el panel.

**Aceptación:** un vecino envía un reporte con foto, el administrador lo atiende y el vecino ve el nuevo estado y la nota. Dos reportes "no pasó" iguales forman una incidencia. Otro usuario no puede leer el reporte ni su foto.

### Fase 5. Notificaciones, simulación y estadísticas
- Recordatorios locales, avisos push por lugar, camión simulado y estadísticas con mapa de calor.
- El simulador avanza sobre `recorridos_ruta` y escribe en `posiciones_unidad` con origen `simulacion`, igual que lo haría un GPS real.

**Aceptación:** un aviso llega solo a quienes siguen ese lugar. El camión se mueve en tiempo real con la etiqueta de simulación. Las estadísticas coinciden con los reportes guardados.

### Fase 6. Cierre
- Pruebas con vecinos, corrección de hallazgos, APK de prueba y documentación.

**Aceptación final:** un vecino consulta su colonia y envía un reporte con foto; el administrador lo atiende; el vecino ve el cambio; y un aviso publicado llega a esa colonia.

## 10. Calidad

- TypeScript estricto y validación compartida en `packages/compartido`.
- Pruebas para reglas de negocio, RLS y flujos críticos.
- Interfaz accesible: buen contraste, textos legibles y controles fáciles de tocar. Debe funcionar en teléfonos Android modestos y con conexión débil.
- Lenguaje claro para ciudadanos, sin tecnicismos.
- Registra las decisiones importantes en `docs/decisiones.md`.

## 11. Decisiones pendientes del usuario

Estas preguntas no bloquean el inicio. Usa el valor predeterminado y no lo presentes como confirmado:

| Pregunta | Valor predeterminado |
|---|---|
| Tamaño del equipo y fecha de entrega | Desconocidos: pregúntalos en la Fase 0 |
| ¿Quién atiende los reportes? | El equipo, como demo |
| ¿Un vehículo cubre ambos turnos? | Sí, supuesto de 8 unidades |
| ¿Se reparten mejor las 4 zonas largas? | Pendiente, no frena la app |
| Base de camiones, relleno y capacidad | Desconocidos |
| Límites oficiales de colonias | Desconocidos |
| Ubicación de los 26 lugares | Se muestran sin mapa |

## 12. Primer mensaje que debes enviar

Antes de cambiar archivos:

1. Confirma que leíste este documento.
2. Resume en cinco líneas qué vas a construir.
3. Revisa el repositorio y confirma que `recursos/` está presente.
4. Pregunta por el tamaño del equipo y la fecha de entrega.
5. Espera confirmación y empieza la Fase 0.
