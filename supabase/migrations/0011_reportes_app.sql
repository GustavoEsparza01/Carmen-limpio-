-- Fase 4: reportes reales desde la app.

-- Aviso de privacidad -------------------------------------------------------
-- Qué versión aceptó cada persona y cuándo. Sin aceptarla no se puede reportar.

alter table public.perfiles
  add column privacidad_version text check (char_length(privacidad_version) between 1 and 40),
  add column privacidad_aceptada timestamptz;

-- perfiles solo la actualiza administración: aceptar el aviso pasa por esta función.
create function public.aceptar_privacidad(p_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para aceptar el aviso de privacidad' using errcode = 'insufficient_privilege';
  end if;
  if p_version is null or char_length(p_version) not between 1 and 40 then
    raise exception 'Versión del aviso no válida' using errcode = 'check_violation';
  end if;
  update public.perfiles
  set privacidad_version = p_version, privacidad_aceptada = now()
  where id = auth.uid();
end;
$$;

revoke execute on function public.aceptar_privacidad(text) from public, anon;
grant execute on function public.aceptar_privacidad(text) to authenticated;

drop policy "crear propios" on public.reportes;
create policy "crear propios" on public.reportes for insert to authenticated
  with check (
    autor = (select auth.uid())
    and exists (
      select 1 from public.perfiles p
      where p.id = (select auth.uid()) and p.privacidad_aceptada is not null
    )
  );

-- Lectura con coordenadas ---------------------------------------------------
-- La API entrega geometry en binario; la vista da longitud y latitud. security_invoker
-- aplica la RLS de reportes: cada ciudadano sigue viendo solo los suyos.

create view public.reportes_detalle with (security_invoker = true) as
select
  r.id, r.autor, r.tipo, r.lugar_id, r.fecha,
  extensions.st_x(r.ubicacion) as lng,
  extensions.st_y(r.ubicacion) as lat,
  r.descripcion, r.foto, r.estado, r.nota, r.incidencia_id, r.creado, r.actualizado
from public.reportes r;

revoke all on public.reportes_detalle from public, anon;
grant select on public.reportes_detalle to authenticated;

-- Fotos ---------------------------------------------------------------------
-- Quien reporta puede borrar sus fotos: al eliminar su cuenta, o si el reporte no se guardó.

create policy "fotos: borrar propias" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos-reportes' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Eliminar la cuenta ----------------------------------------------------------
-- Derecho de cancelación: borra la cuenta, su perfil y sus reportes (en cascada).
-- Las fotos se borran antes desde la app con la API de Storage.

create function public.eliminar_mi_cuenta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para eliminar tu cuenta' using errcode = 'insufficient_privilege';
  end if;
  if public.es_admin() then
    raise exception 'Una cuenta de administración no se elimina desde la app' using errcode = 'insufficient_privilege';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.eliminar_mi_cuenta() from public, anon;
grant execute on function public.eliminar_mi_cuenta() to authenticated;
