import { avisosProgramados, COLORES, type LugarGuardado } from '@carmen-limpio/compartido';
import * as Notificaciones from 'expo-notifications';

const CANAL = 'recordatorios';

Notificaciones.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function prepararCanal() {
  await Notificaciones.setNotificationChannelAsync(CANAL, {
    importance: Notificaciones.AndroidImportance.DEFAULT,
    lightColor: COLORES.primario,
    name: 'Recordatorios de recolección',
  });
}

async function tienePermiso() {
  const { granted } = await Notificaciones.getPermissionsAsync();
  return granted;
}

// Solo se llama cuando la persona activa un recordatorio.
export async function pedirPermiso(): Promise<boolean> {
  if (await tienePermiso()) return true;
  await prepararCanal();
  const { granted } = await Notificaciones.requestPermissionsAsync();
  return granted;
}

// Cancela y vuelve a programar: así un cambio de ajustes nunca deja avisos duplicados.
export async function reprogramar(guardados: readonly LugarGuardado[]): Promise<number> {
  await Notificaciones.cancelAllScheduledNotificationsAsync();
  if (!(await tienePermiso())) return 0;
  await prepararCanal();
  const avisos = avisosProgramados(guardados, new Date());
  await Promise.all(
    avisos.map(({ id, fecha, titulo, cuerpo }) =>
      Notificaciones.scheduleNotificationAsync({
        content: { body: cuerpo, title: titulo },
        identifier: id,
        trigger: { channelId: CANAL, date: fecha, type: Notificaciones.SchedulableTriggerInputTypes.DATE },
      }),
    ),
  );
  return avisos.length;
}
