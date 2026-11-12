-- Con search_path vacío, geometry = geometry es ambiguo: la ubicación se compara en binario.
create or replace function public.validar_cambio_reporte()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.id, new.autor, new.tipo, new.lugar_id, new.fecha, extensions.st_asewkb(new.ubicacion),
      new.descripcion, new.foto, new.creado)
     is distinct from
     (old.id, old.autor, old.tipo, old.lugar_id, old.fecha, extensions.st_asewkb(old.ubicacion),
      old.descripcion, old.foto, old.creado) then
    raise exception 'Solo se pueden cambiar el estado, la nota y la incidencia' using errcode = 'check_violation';
  end if;

  if new.estado is distinct from old.estado then
    if not (
      (old.estado = 'recibido' and new.estado = 'enRevision')
      or (old.estado = 'enRevision' and new.estado in ('atendido', 'rechazado'))
    ) then
      raise exception 'Cambio de estado no permitido: % → %', old.estado, new.estado using errcode = 'check_violation';
    end if;
    if new.nota is not distinct from old.nota or char_length(trim(new.nota)) < 3 then
      raise exception 'Cada cambio de estado lleva una nota nueva para el ciudadano' using errcode = 'check_violation';
    end if;
  end if;

  new.actualizado := now();
  return new;
end;
$$;
