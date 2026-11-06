# Carmen Limpio

Plataforma para consultar y dar seguimiento a la recolección de residuos en Ciudad del Carmen, Campeche: app móvil para ciudadanos y panel web para administradores. El detalle completo está en `docs/PROMPT-CARMEN-LIMPIO.md`; las decisiones, en `docs/decisiones.md`.

## Forma de trabajo

- Todo en español: conversación, documentación, interfaz y commits.
- Una fase a la vez. Al terminar, muestra qué funciona, qué se probó y qué falta, y espera visto bueno.
- Usa `herramientas/rutas/`, no rehagas el trazado de rutas.
- No inventes datos operativos: márcalos como pendientes o ilustrativos.
- No agregues funciones fuera del alcance (sección 5 del prompt) sin preguntar.
- Commits pequeños en una rama por fase. Sin `push`, PR ni fusión a la rama principal sin pedirlo.
- Claves solo en variables de entorno. La `service_role` de Supabase jamás llega a la app ni al panel.
- Verifica antes de afirmar. Si algo no se pudo probar, dilo.

## Reglas de producto

- La app **no es oficial**, y debe decirlo mientras no exista un convenio.
- No uses los logos ni la identidad visual de "Carmen siempre Limpio" ni de SOS de la Isla.
- Muestra ventanas ("martes, jueves y sábado, 7:00 a 15:00"), nunca una hora exacta de llegada.
- Zona horaria: siempre `America/Merida`.
- Todo trazado se etiqueta como ilustrativo hasta tener validación oficial.
- Consultar no requiere cuenta. Reportar y dar seguimiento sí.
- Aviso de privacidad (LFPDPPP) antes de pedir datos. Las fotos de reportes no son públicas.
- Los reportes los atiende el equipo como demo: no sugieras que llegan al municipio o a SOS.
- No prometas IA.
- No extraigas datos de `sosdelaisla.com` sin autorización del usuario.

## Datos

- **Escenarios:** `carteles` (app ciudadana) y `propuesta` (panel y demostración) no se mezclan. `M1`, `V1`, etc. **no significan lo mismo** en ambos. Nunca muestres geometría de `propuesta` a un ciudadano como si fuera su ruta.
- El horario de un lugar viene del cartel, no de sus coordenadas: un lugar sin ubicar aparece igual en la búsqueda, solo le falta el mapa.
- Un mismo lugar puede estar en dos rutas con días distintos (Bivalvo, Renovación VII).
- En `rutas.json`, un lugar puede ser texto u objeto `{nombre, dias, nota}`.
- Que V1 cubra Renovación VII jueves y sábado es una deducción sin confirmar.
- Los mapas deben conservar la atribución de OpenStreetMap (ODbL).

## Estructura

| Ruta | Contenido |
|---|---|
| `apps/movil` | App ciudadana (Expo, solo Android, *development build*) |
| `apps/panel` | Panel web (React, Vite y Leaflet) |
| `packages/compartido` | Tipos, validaciones y constantes |
| `supabase/` | Migraciones y datos iniciales |
| `herramientas/rutas/` | Datos y scripts del trazado (se ejecutan desde esa carpeta) |
| `docs/` | Documento original, carteles y decisiones |

## Comandos

```bash
npm install          # desde la raíz
npm run panel        # panel en http://localhost:5173
npm run android      # compila e instala el development build
npm run movil        # servidor de desarrollo para el development build
npm run typecheck
npm test
```

## Expo

- Expo cambia entre versiones: consulta la documentación de la versión instalada, no la memoria.
- Instala paquetes de la app con `npx expo install` desde `apps/movil`, no con `npm install`.
- Expo Go no sirve para este proyecto; usa el *development build*.
- `apps/movil/android/` es generado y no entra al repositorio.
- `react` debe tener la misma versión exacta en `apps/movil` y `apps/panel`.
- No uses `npm audit fix --force`: degrada Expo.
- No uses `npm install -w` para una instalación inicial: solo instala ese workspace.
