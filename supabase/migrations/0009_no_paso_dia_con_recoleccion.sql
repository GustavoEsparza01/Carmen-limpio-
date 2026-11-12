-- "El camión no pasó" solo vale en un día con recolección en ese lugar, según el cartel.
-- Evita incidencias falsas, como un "no pasó" en lunes donde solo hay servicio martes, jueves y sábado.
create or replace function public.preparar_reporte()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hoy date := (now() at time zone 'America/Merida')::date;
  recientes int;
begin
  if auth.uid() is not null and new.autor is distinct from auth.uid() then
    raise exception 'No puedes crear reportes a nombre de otra persona' using errcode = 'insufficient_privilege';
  end if;
  new.estado := 'recibido';
  new.nota := 'Recibido. Lo atiende el equipo del proyecto como demostración.';
  new.incidencia_id := null;
  new.creado := now();
  new.actualizado := now();

  if new.fecha is not null and (new.fecha > hoy or new.fecha < hoy - 30) then
    raise exception 'La fecha debe estar entre hoy y 30 días atrás' using errcode = 'check_violation';
  end if;

  if new.tipo = 'noPaso' and not exists (
    select 1 from public.horarios h
    where h.lugar_id = new.lugar_id
      and (array['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']::public.dia_semana[])
          [extract(isodow from new.fecha)::int] = any (h.dias)
  ) then
    raise exception 'Ese día no hay recolección en este lugar' using errcode = 'check_violation';
  end if;

  if new.foto is not null and split_part(new.foto, '/', 1) <> new.autor::text then
    raise exception 'La foto debe estar en la carpeta de su autor' using errcode = 'check_violation';
  end if;

  select count(*) into recientes
  from public.reportes
  where autor = new.autor and creado > now() - interval '24 hours';
  if recientes >= public.limite_reportes_por_dia() then
    raise exception 'Llegaste al límite de % reportes en 24 horas', public.limite_reportes_por_dia()
      using errcode = 'check_violation';
  end if;

  if new.tipo = 'noPaso' then
    insert into public.incidencias (lugar_id, fecha)
    values (new.lugar_id, new.fecha)
    on conflict (lugar_id, fecha) do nothing;
    select id into new.incidencia_id
    from public.incidencias
    where lugar_id = new.lugar_id and fecha = new.fecha;
  end if;

  return new;
end;
$$;
