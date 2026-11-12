-- Fase 5: camión simulado en Supabase.
-- Avanza sobre el trazado ilustrativo de carteles (recorridos_ruta, escenario carteles), nunca sobre la
-- propuesta: el vecino lo ve en la app. No representa la ubicación de ningún camión real.
-- Las líneas de carteles las carga el seed (generar-seed.ts), porque dependen de las rutas.

alter table public.posiciones_unidad
  add column ruta_id text references public.rutas (id) on delete cascade;
create index posiciones_unidad_ruta_idx on public.posiciones_unidad (ruta_id, fecha desc);

-- Una vuelta completa a la ruta cada 30 minutos, solo en la ventana del turno y en días con recolección.
-- La velocidad es de demostración: no sirve para estimar llegadas.
create function public.simular_camiones()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  ahora timestamp := now() at time zone 'America/Merida';
  dia public.dia_semana :=
    (array['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']::public.dia_semana[])
    [extract(isodow from ahora)::int];
  vuelta constant numeric := 1800;
  avance double precision := mod(extract(epoch from now())::numeric, vuelta) / vuelta;
  escritas int;
begin
  insert into public.posiciones_unidad (unidad, ruta_id, punto, origen)
  select a.unidad, a.ruta_id, extensions.st_lineinterpolatepoint(rr.geom, avance), 'simulacion'
  from public.asignaciones a
  join public.unidades u on u.numero = a.unidad and u.estado = 'activa'
  join public.recorridos_ruta rr on rr.ruta_id = a.ruta_id and rr.escenario = 'carteles'
  where a.desde <= ahora::date
    and (a.hasta is null or a.hasta >= ahora::date)
    and exists (
      select 1 from public.horarios h
      where h.ruta_id = a.ruta_id and dia = any (h.dias) and ahora::time >= h.inicio and ahora::time < h.fin
    );
  get diagnostics escritas = row_count;

  -- Solo importa la posición reciente: la tabla no crece sin límite.
  delete from public.posiciones_unidad where origen = 'simulacion' and fecha < now() - interval '2 hours';
  return escritas;
end;
$$;

revoke execute on function public.simular_camiones() from public, anon, authenticated;

-- Cada 10 segundos (pg_cron admite intervalos en segundos).
create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule(jobid) from cron.job where jobname = 'simular-camiones';
select cron.schedule('simular-camiones', '10 seconds', 'select public.simular_camiones()');

-- pg_cron guarda cada ejecución (unas 8,640 al día): se borran las de más de un día.
select cron.unschedule(jobid) from cron.job where jobname = 'limpiar-historial-cron';
select cron.schedule('limpiar-historial-cron', '17 4 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '1 day'$$);

-- Tiempo real: la app recibe cada posición nueva. La RLS sigue aplicando (el público solo ve la simulación).
alter publication supabase_realtime add table public.posiciones_unidad;
