import { Directory, File, Paths } from 'expo-file-system';
import * as Selector from 'expo-image-picker';

export type OrigenFoto = 'camara' | 'galeria';
export type ResultadoFoto = { uri: string } | { error: 'sinPermiso' | 'cancelado' };

const OPCIONES: Selector.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };

// La carpeta privada de la app: la foto no sale del teléfono ni aparece en la galería.
function carpeta() {
  const destino = new Directory(Paths.document, 'reportes');
  if (!destino.exists) destino.create({ idempotent: true, intermediates: true });
  return destino;
}

// El permiso de cámara se pide aquí, al usarla. La galería de Android no necesita permiso.
export async function elegirFoto(origen: OrigenFoto): Promise<ResultadoFoto> {
  if (origen === 'camara') {
    const { granted } = await Selector.requestCameraPermissionsAsync();
    if (!granted) return { error: 'sinPermiso' };
  }
  const resultado =
    origen === 'camara' ? await Selector.launchCameraAsync(OPCIONES) : await Selector.launchImageLibraryAsync(OPCIONES);
  const elegida = resultado.assets?.[0];
  if (resultado.canceled || !elegida) return { error: 'cancelado' };

  const copia = new File(carpeta(), `foto-${Date.now()}.jpg`);
  new File(elegida.uri).copy(copia);
  return { uri: copia.uri };
}

export function borrarFoto(uri: string) {
  try {
    const foto = new File(uri);
    if (foto.exists) foto.delete();
  } catch {
    // Una foto que ya no existe no debe impedir borrar el reporte.
  }
}
