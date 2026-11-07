import { COLORES } from '@carmen-limpio/compartido';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useReducirAnimacion } from '../../estado/animacion';
import { ENCABEZADO, FUENTE } from '../../estilos/tema';

type NombreIcono = ComponentProps<typeof Ionicons>['name'];

function icono(activo: NombreIcono, inactivo: NombreIcono) {
  return ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons color={color as string} name={focused ? activo : inactivo} size={size} />
  );
}

export default function Pestanas() {
  const reducir = useReducirAnimacion();

  return (
    <Tabs
      backBehavior="initialRoute"
      screenOptions={{
        ...ENCABEZADO,
        animation: reducir ? 'none' : 'fade',
        sceneStyle: { backgroundColor: COLORES.fondo },
        tabBarActiveTintColor: COLORES.primario,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: COLORES.inactivoTexto,
        tabBarLabelStyle: { fontFamily: FUENTE, fontSize: 13, fontWeight: '600' },
        tabBarStyle: { backgroundColor: COLORES.superficie, borderTopColor: COLORES.borde },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ headerShown: false, tabBarIcon: icono('home', 'home-outline'), title: 'Inicio' }}
      />
      <Tabs.Screen
        name="mapa"
        options={{ headerShown: false, tabBarIcon: icono('map', 'map-outline'), title: 'Mapa' }}
      />
      <Tabs.Screen
        name="reportes"
        options={{ tabBarIcon: icono('document-text', 'document-text-outline'), title: 'Reportes' }}
      />
      <Tabs.Screen
        name="avisos"
        options={{ tabBarIcon: icono('megaphone', 'megaphone-outline'), title: 'Avisos' }}
      />
    </Tabs>
  );
}
