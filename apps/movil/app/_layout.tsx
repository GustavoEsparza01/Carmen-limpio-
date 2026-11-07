import { COLORES } from '@carmen-limpio/compartido';
import { Stack } from 'expo-router';
import { ProveedorDemo } from '../estado/demo';
import { ProveedorGuardados } from '../estado/guardados';
import { useReducirAnimacion } from '../estado/animacion';
import { ENCABEZADO } from '../estilos/tema';

export default function Raiz() {
  const reducir = useReducirAnimacion();

  return (
    <ProveedorGuardados>
      <ProveedorDemo>
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
          <Stack.Screen name="reportes/nuevo" options={{ title: 'Nuevo reporte' }} />
          <Stack.Screen name="reportes/[id]" options={{ title: 'Reporte' }} />
        </Stack>
      </ProveedorDemo>
    </ProveedorGuardados>
  );
}
