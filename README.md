# Carmen Limpio

Plataforma para consultar y dar seguimiento a la recolección de residuos urbanos en Ciudad del Carmen, Campeche.

> Proyecto independiente. No es una app oficial del municipio ni de la empresa recolectora. Los horarios provienen de carteles públicos y los trazados son ilustrativos hasta contar con validación oficial.

## Requisitos

- Node.js 24 o superior
- JDK 17
- Android Studio con el SDK de Android, y un emulador o un teléfono con depuración USB

Define `ANDROID_HOME` con la ruta del SDK. Sin ella, la compilación falla con `SDK location not found`. En Windows, ejecuta esto una vez en `cmd` y abre una terminal nueva:

```bat
setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"
```

## Arranque

```bash
npm install
cp .env.example .env   # URL y clave anon de Supabase (nunca la service_role)
npm run panel          # panel en http://localhost:5173
npm run android        # compila e instala la app en Android
```

`npm run android` deja Metro corriendo en esa terminal; déjala abierta mientras usas la app. Después de la primera instalación, `npm run movil` basta mientras no cambien las dependencias nativas. Usa uno u otro, no ambos: comparten el puerto 8081. La app usa un *development build*: Expo Go no sirve para este proyecto.

### Problemas comunes

| Mensaje | Solución |
|---|---|
| `SDK location not found` | Define `ANDROID_HOME` y abre una terminal nueva |
| `Expo stopped waiting for the ADB device discovery operation to finish` | ADB está saturado. Reinícialo con `adb kill-server` y `adb start-server` (`adb` está en `platform-tools` del SDK) y repite el comando |
| El puerto 8081 está ocupado | Cierra la otra terminal donde corre Metro |

## Base de datos (Supabase en la nube)

La primera vez, en una terminal de PowerShell aparte (piden interacción):

```bash
npx supabase login
npx supabase link --project-ref <ref-del-proyecto>
```

Después, desde la raíz:

```bash
npm run db:seed       # regenera supabase/seed.sql desde herramientas/rutas
npm run db:aplicar    # aplica migraciones pendientes (y el seed en una base vacía)
npm run db:pruebas    # pruebas de RLS: deben terminar con "PRUEBAS_OK"
```

Las pruebas crean usuarios y reportes de prueba y lo revierten todo al final; el mensaje `PRUEBAS_OK` llega como error a propósito. El CLI pide confirmación antes de escribir en el proyecto.

## Estructura

```text
apps/movil            App ciudadana (Expo)
apps/panel            Panel web (React + Leaflet)
packages/compartido   Tipos, validaciones y constantes
supabase/             Migraciones y datos iniciales
herramientas/rutas/   Datos y scripts del trazado
docs/                 Documento original, carteles y decisiones
```

## Comprobaciones

```bash
npm run typecheck
npm test
cd herramientas/rutas && node scripts/verificar-cobertura.ts
```

## Datos y licencias

Los datos viales provienen de [OpenStreetMap](https://www.openstreetmap.org/copyright), bajo licencia ODbL.
