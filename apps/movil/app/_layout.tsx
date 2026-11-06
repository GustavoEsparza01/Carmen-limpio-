import { COLORES } from '@carmen-limpio/compartido';
import { Stack } from 'expo-router';
import { ProveedorFavorita } from '../estado/favorita';
import { FUENTE } from '../estilos/tema';

export default function Raiz() {
  return (
    <ProveedorFavorita>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: COLORES.fondo },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: COLORES.superficie },
          headerTintColor: COLORES.texto,
          headerTitleStyle: { fontFamily: FUENTE, fontWeight: '700' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="lugar/[id]" options={{ title: 'Horario' }} />
        <Stack.Screen name="rutas/index" options={{ title: 'Rutas' }} />
        <Stack.Screen name="mapa/[rutaId]" options={{ headerShown: false }} />
      </Stack>
    </ProveedorFavorita>
  );
}
