import { router } from 'expo-router';
import { Boton, PantallaVacia } from '../../componentes/ui';

export default function Mapa() {
  return (
    <PantallaVacia
      icono="map"
      texto="Pronto verás aquí las 15 rutas de la ciudad en un solo mapa. Por ahora puedes abrirlas una por una."
      titulo="Mapa de la ciudad"
    >
      <Boton icono="bus" onPress={() => router.push('/rutas')} texto="Ver las rutas" />
    </PantallaVacia>
  );
}
