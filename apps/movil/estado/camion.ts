import { puntoDesdeGeometria, type Coordenadas } from '@carmen-limpio/compartido';
import { useEffect, useState } from 'react';
import { conLimite, supabase } from './supabase';

// Camión simulado que mueve Supabase (migración 0012) sobre el trazado de carteles.
// No es la ubicación de ningún camión real.

// La función escribe cada 10 s; si la última posición es más vieja, la simulación no está en servicio.
const VIGENCIA_MS = 30_000;

export type EstadoCamion =
  // Sin Supabase configurado: el teléfono simula por su cuenta, como antes.
  | { tipo: 'local' }
  | { tipo: 'buscando' }
  | { tipo: 'fueraDeServicio' }
  | { tipo: 'sinConexion' }
  | { tipo: 'enServicio'; punto: Coordenadas; recibido: number };

interface FilaPosicion {
  punto: unknown;
  fecha: string;
}

export function useCamionSimulado(rutaId: string, activo: boolean): EstadoCamion {
  const [estado, setEstado] = useState<EstadoCamion>(supabase ? { tipo: 'buscando' } : { tipo: 'local' });

  useEffect(() => {
    if (!supabase || !activo) return;
    const cliente = supabase;
    let vigente = true;
    setEstado({ tipo: 'buscando' });

    const recibir = (fila: FilaPosicion) => {
      const punto = puntoDesdeGeometria(fila.punto);
      if (!punto || !vigente) return;
      setEstado({ tipo: 'enServicio', punto, recibido: Date.now() });
    };

    const desde = new Date(Date.now() - VIGENCIA_MS).toISOString();
    conLimite(
      cliente
        .from('posiciones_unidad')
        .select('punto, fecha')
        .eq('ruta_id', rutaId)
        .eq('origen', 'simulacion')
        .gte('fecha', desde)
        .order('fecha', { ascending: false })
        .limit(1),
    )
      .then(({ data, error }) => {
        if (!vigente) return;
        if (error) return setEstado({ tipo: 'sinConexion' });
        const ultima = (data as FilaPosicion[] | null)?.[0];
        if (ultima) recibir(ultima);
        else setEstado((actual) => (actual.tipo === 'enServicio' ? actual : { tipo: 'fueraDeServicio' }));
      })
      .catch(() => vigente && setEstado({ tipo: 'sinConexion' }));

    const canal = cliente
      .channel(`camion-${rutaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posiciones_unidad', filter: `ruta_id=eq.${rutaId}` },
        ({ new: fila }) => recibir(fila as FilaPosicion),
      )
      .subscribe();

    // Si dejan de llegar posiciones (terminó la ventana), el camión desaparece.
    const revision = setInterval(() => {
      setEstado((actual) =>
        actual.tipo === 'enServicio' && Date.now() - actual.recibido > VIGENCIA_MS ? { tipo: 'fueraDeServicio' } : actual,
      );
    }, 5_000);

    return () => {
      vigente = false;
      clearInterval(revision);
      cliente.removeChannel(canal);
    };
  }, [rutaId, activo]);

  return estado;
}
