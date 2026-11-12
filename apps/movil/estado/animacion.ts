import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

let reducir = false;
const oyentes = new Set<() => void>();

function cambiar(valor: boolean) {
  reducir = valor;
  oyentes.forEach((avisar) => avisar());
}

AccessibilityInfo.isReduceMotionEnabled()
  .then(cambiar)
  .catch(() => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', cambiar);

function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
}

// Preferencia del teléfono "reducir animaciones" (quitar animaciones en Android).
export function useReducirAnimacion(): boolean {
  return useSyncExternalStore(suscribir, () => reducir);
}
