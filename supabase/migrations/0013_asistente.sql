-- Asistente con IA (demo): cuenta preguntas para no agotar la cuota gratuita del proveedor.
-- No guarda preguntas ni respuestas. El identificador es aleatorio, lo crea la app y no se liga a ninguna cuenta.

create table public.uso_asistente (
  dia date not null,
  dispositivo uuid not null,
  preguntas int not null default 0 check (preguntas >= 0),
  primary key (dia, dispositivo)
);
comment on table public.uso_asistente is 'Contador diario del asistente. Solo lo usa la función asistente, con service_role.';

-- Sin políticas: ni el público ni las cuentas la ven.
alter table public.uso_asistente enable row level security;
revoke all on public.uso_asistente from public, anon, authenticated;

-- Aparta una pregunta si hay cupo. Devuelve 'ok', 'dispositivo' o 'diario'.
create function public.registrar_pregunta(p_dispositivo uuid, p_limite_dispositivo int, p_limite_diario int)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  hoy constant date := (now() at time zone 'America/Merida')::date;
begin
  -- Una a la vez: dos preguntas simultáneas no pueden pasarse del límite.
  perform pg_advisory_xact_lock(hashtext('public.uso_asistente'));

  -- Solo importa el día en curso.
  delete from public.uso_asistente where dia < hoy;

  if coalesce((select u.preguntas from public.uso_asistente u where u.dia = hoy and u.dispositivo = p_dispositivo), 0)
     >= p_limite_dispositivo then
    return 'dispositivo';
  end if;
  if coalesce((select sum(u.preguntas) from public.uso_asistente u where u.dia = hoy), 0) >= p_limite_diario then
    return 'diario';
  end if;

  insert into public.uso_asistente as u (dia, dispositivo, preguntas) values (hoy, p_dispositivo, 1)
  on conflict (dia, dispositivo) do update set preguntas = u.preguntas + 1;
  return 'ok';
end;
$$;

revoke execute on function public.registrar_pregunta(uuid, int, int) from public, anon, authenticated;
grant execute on function public.registrar_pregunta(uuid, int, int) to service_role;
