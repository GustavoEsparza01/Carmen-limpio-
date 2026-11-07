// El servidor público de OpenStreetMap solo sirve para el prototipo.
const URL_MOSAICOS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// Mosaico de la isla, usado solo para comprobar que el mapa base responde.
export const URL_PRUEBA_MAPA = URL_MOSAICOS.replace('{z}/{x}/{y}', '12/1003/1832');

// Atenuado para que la línea de la ruta destaque sobre el mapa.
export const ESTILO_MAPA = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: [URL_MOSAICOS],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster' as const,
      source: 'osm',
      paint: { 'raster-brightness-min': 0.15, 'raster-contrast': -0.2, 'raster-saturation': -0.7 },
    },
  ],
};
