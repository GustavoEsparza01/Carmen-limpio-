const ABREVIATURAS: Record<string, string> = {
  av: 'avenida',
  frac: 'fraccionamiento',
  fracc: 'fraccionamiento',
  priv: 'privada',
  col: 'colonia',
  i: '1',
  ii: '2',
  iii: '3',
  iv: '4',
  v: '5',
  vi: '6',
  vii: '7',
  viii: '8',
};

// Pasa a palabras comparables: sin acentos, sin abreviaturas y con números arábigos.
function palabras(texto: string): string[] {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9ñ]+/)
    .filter(Boolean)
    .map((p) => ABREVIATURAS[p] ?? p);
}

// Tolera las confusiones de escritura más comunes, como "Bivalbo" o "Nacosari".
function sinFaltas(palabra: string): string {
  return palabra.replace(/v/g, 'b').replace(/z/g, 's');
}

export function idLugar(nombre: string): string {
  return palabras(nombre).join('-');
}

export function coincide(nombre: string, consulta: string): boolean {
  const buscadas = palabras(consulta).map(sinFaltas);
  const propias = palabras(nombre).map(sinFaltas);
  return buscadas.length > 0 && buscadas.every((b) => propias.some((p) => p.startsWith(b)));
}
