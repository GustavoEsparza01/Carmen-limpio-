import { COLORES } from '@carmen-limpio/compartido';
import { Stack } from 'expo-router';
import { ProveedorCatalogo } from '../estado/catalogo';
import { ProveedorCuenta } from '../estado/cuenta';
import { ProveedorGuardados } from '../estado/guardados';
import { useReducirAnimacion } from '../estado/animacion';
import { ENCABEZADO } from '../estilos/tema';

export default function Raiz() {
  const reducir = useReducirAnimacion();

  return (
    <ProveedorCatalogo>
      <ProveedorGuardados>
        <ProveedorCuenta>
          <Stack
            screenOptions={{
              ...ENCABEZADO,
              animation: reducir ? 'none' : 'slide_from_right',
              contentStyle: { backgroundColor: COLORES.fondo },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="bienvenida" options={{ headerShown: false }} />
            <Stack.Screen name="lugar/[id]" options={{ title: 'Horario' }} />
            <Stack.Screen name="rutas/index" options={{ title: 'Rutas' }} />
            <Stack.Screen name="mapa/[rutaId]" options={{ headerShown: false }} />
            <Stack.Screen name="reportes/privacidad" options={{ title: 'Aviso de privacidad' }} />
            <Stack.Screen name="reportes/cuenta" options={{ title: 'Tu cuenta' }} />
            <Stack.Screen name="reportes/recuperar" options={{ title: 'Olvidé mi contraseña' }} />
            <Stack.Screen name="reportes/nuevo" options={{ title: 'Nuevo reporte' }} />
            <Stack.Screen name="reportes/[id]" options={{ title: 'Reporte' }} />
          </Stack>
        </ProveedorCuenta>
      </ProveedorGuardados>
    </ProveedorCatalogo>
  );
}
