import { COLORES } from '@carmen-limpio/compartido';
import { Stack } from 'expo-router';
import { ProveedorFavorita } from '../estado/favorita';
import { ENCABEZADO } from '../estilos/tema';

export default function Raiz() {
  return (
    <ProveedorFavorita>
      <Stack screenOptions={{ ...ENCABEZADO, contentStyle: { backgroundColor: COLORES.fondo } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lugar/[id]" options={{ title: 'Horario' }} />
        <Stack.Screen name="rutas/index" options={{ title: 'Rutas' }} />
        <Stack.Screen name="mapa/[rutaId]" options={{ headerShown: false }} />
      </Stack>
    </ProveedorFavorita>
  );
}
