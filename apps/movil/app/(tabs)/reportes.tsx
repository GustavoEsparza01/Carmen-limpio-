import { AVISO_REPORTES_DEMOSTRACION } from '@carmen-limpio/compartido';
import { Aviso, PantallaVacia } from '../../componentes/ui';

export default function Reportes() {
  return (
    <PantallaVacia
      icono="document-text"
      texto="Pronto podrás probar aquí cómo sería registrar que el camión no pasó, una acumulación de basura o un tiradero clandestino."
      titulo="Reportes de demostración"
    >
      <Aviso>{AVISO_REPORTES_DEMOSTRACION}</Aviso>
    </PantallaVacia>
  );
}
