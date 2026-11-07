import { COLORES } from '@carmen-limpio/compartido';
import { Stack } from 'expo-router';
import { ProveedorGuardados } from '../estado/guardados';
import { ENCABEZADO } from '../estilos/tema';

export default function Raiz() {
  return (
    <ProveedorGuardados>
      <Stack screenOptions={{ ...ENCABEZADO, contentStyle: { backgroundColor: COLORES.fondo } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="bienvenida" options={{ headerShown: false }} />
        <Stack.Screen name="lugar/[id]" options={{ title: 'Horario' }} />
        <Stack.Screen name="rutas/index" options={{ title: 'Rutas' }} />
        <Stack.Screen name="mapa/[rutaId]" options={{ headerShown: false }} />
      </Stack>
    </ProveedorGuardados>
  );
}
