-- Cuentas, unidades, avisos, reportes, posiciones y dispositivos.

create type public.rol as enum ('ciudadano', 'administrador');
create type public.estado_unidad as enum ('activa', 'taller', 'baja');
-- Los mismos valores que usa packages/compartido/src/reportes.ts.
create type public.tipo_reporte as enum ('noPaso', 'acumulacion', 'tiradero');
create type public.estado_reporte as enum ('recibido', 'enRevision', 'atendido', 'rechazado');
create type public.origen_posicion as enum ('simulacion', 'gps');

-- Perfiles ------------------------------------------------------------------

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  rol public.rol not null default 'ciudadano',
  nombre text check (char_length(nombre) <= 80),
  creado timestamptz not null default now()
);

-- Toda cuenta nueva es ciudadana. El rol de administrador solo se asigna desde la base.
create function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id) values (new.id);
  return new;
end;
$$;

create trigger crear_perfil
after insert on auth.users
for each row execute function public.crear_perfil();

-- El rol se comprueba en el servidor. security definer evita recursión con la RLS de perfiles.
create function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and rol = 'administrador'
  );
$$;

-- Unidades y asignaciones ---------------------------------------------------

create table public.unidades (
  numero smallint primary key check (numero > 0),
  placas text,
  estado public.estado_unidad not null default 'activa',
  nota text
);

-- Que un vehículo cubra ambos turnos es un supuesto: se cambia aquí, sin migraciones.
create table public.asignaciones (
  id bigint generated always as identity primary key,
  unidad smallint not null references public.unidades (numero) on delete cascade,
  ruta_id text not null references public.rutas (id) on delete cascade,
  desde date not null,
  hasta date,
  nota text,
  check (hasta is null or hasta >= desde),
  -- Una ruta no puede tener dos unidades asignadas en el mismo periodo.
  exclude using gist (ruta_id with =, daterange(desde, hasta, '[]') with &&)
);

-- Avisos --------------------------------------------------------------------

create table public.avisos (
  id bigint generated always as identity primary key,
  titulo text not null check (char_length(titulo) between 3 and 120),
  texto text not null check (char_length(texto) between 3 and 2000),
  desde timestamptz not null default now(),
  hasta timestamptz,
  publicado boolean not null default false,
  creado_por uuid references public.perfiles (id) on delete set null default auth.uid(),
  creado timestamptz not null default now(),
  check (hasta is null or hasta > desde)
);

create table public.avisos_lugares (
  aviso_id bigint not null references public.avisos (id) on delete cascade,
  lugar_id text not null references public.lugares (id) on delete cascade,
  primary key (aviso_id, lugar_id)
);
create index avisos_lugares_lugar_idx on public.avisos_lugares (lugar_id);

-- Reportes ------------------------------------------------------------------

-- Varios "no pasó" del mismo lugar y fecha forman una sola incidencia.
create table public.incidencias (
  id bigint generated always as identity primary key,
  lugar_id text not null references public.lugares (id) on delete cascade,
  fecha date not null,
  creada timestamptz not null default now(),
  unique (lugar_id, fecha)
);

create table public.reportes (
  id uuid primary key default gen_random_uuid(),
  autor uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  tipo public.tipo_reporte not null,
  lugar_id text references public.lugares (id) on delete set null,
  -- Fecha en hora de America/Merida.
  fecha date,
  ubicacion extensions.geometry(Point, 4326),
  descripcion text check (char_length(descripcion) <= 1000),
  -- Ruta dentro del bucket privado fotos-reportes: <autor>/<archivo>.
  foto text,
  estado public.estado_reporte not null default 'recibido',
  -- Última nota, siempre visible para quien reportó.
  nota text not null default '',
  incidencia_id bigint references public.incidencias (id) on delete set null,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  check (tipo <> 'noPaso' or (lugar_id is not null and fecha is not null)),
  check (tipo <> 'acumulacion' or ((lugar_id is not null or ubicacion is not null) and char_length(descripcion) >= 10)),
  check (tipo <> 'tiradero' or (ubicacion is not null and char_length(descripcion) >= 10 and foto is not null))
);
create index reportes_autor_idx on public.reportes (autor, creado desc);
create index reportes_estado_idx on public.reportes (estado, creado desc);
create index reportes_ubicacion_idx on public.reportes using gist (ubicacion);
-- Una persona no repite el mismo "no pasó".
create unique index reportes_no_paso_unico on public.reportes (autor, lugar_id, fecha) where tipo = 'noPaso';

create table public.historial_reportes (
  id bigint generated always as identity primary key,
  reporte_id uuid not null references public.reportes (id) on delete cascade,
  estado public.estado_reporte not null,
  nota text not null,
  autor uuid references public.perfiles (id) on delete set null,
  fecha timestamptz not null default now()
);
create index historial_reportes_reporte_idx on public.historial_reportes (reporte_id, fecha);

-- Límites razonables contra abuso.
create function public.limite_reportes_por_dia() returns int language sql immutable as 'select 10';

create function public.preparar_reporte()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hoy date := (now() at time zone 'America/Merida')::date;
  recientes int;
begin
  if auth.uid() is not null then
    new.autor := auth.uid();
  end if;
  new.estado := 'recibido';
  new.nota := 'Recibido. Lo atiende el equipo del proyecto como demostración.';
  new.incidencia_id := null;
  new.creado := now();
  new.actualizado := now();

  if new.fecha is not null and (new.fecha > hoy or new.fecha < hoy - 30) then
    raise exception 'La fecha debe estar entre hoy y 30 días atrás' using errcode = 'check_violation';
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

create trigger preparar_reporte
before insert on public.reportes
for each row execute function public.preparar_reporte();

-- Solo cambian estado, nota e incidencia; el estado sigue Recibido → En revisión → Atendido o Rechazado.
create function public.validar_cambio_reporte()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.id, new.autor, new.tipo, new.lugar_id, new.fecha, new.ubicacion, new.descripcion, new.foto, new.creado)
     is distinct from
     (old.id, old.autor, old.tipo, old.lugar_id, old.fecha, old.ubicacion, old.descripcion, old.foto, old.creado) then
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

create trigger validar_cambio_reporte
before update on public.reportes
for each row execute function public.validar_cambio_reporte();

create function public.registrar_historial_reporte()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.estado is distinct from old.estado or new.nota is distinct from old.nota then
    insert into public.historial_reportes (reporte_id, estado, nota, autor)
    values (new.id, new.estado, new.nota, auth.uid());
  end if;
  return null;
end;
$$;

create trigger registrar_historial_reporte
after insert or update on public.reportes
for each row execute function public.registrar_historial_reporte();

-- Posiciones y dispositivos -------------------------------------------------

create table public.posiciones_unidad (
  id bigint generated always as identity primary key,
  unidad smallint not null references public.unidades (numero) on delete cascade,
  punto extensions.geometry(Point, 4326) not null,
  fecha timestamptz not null default now(),
  origen public.origen_posicion not null
);
create index posiciones_unidad_idx on public.posiciones_unidad (unidad, fecha desc);

create table public.dispositivos (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  token text not null unique,
  plataforma text not null default 'android' check (plataforma = 'android'),
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index dispositivos_usuario_idx on public.dispositivos (usuario);

create table public.dispositivos_lugares (
  dispositivo_id uuid not null references public.dispositivos (id) on delete cascade,
  lugar_id text not null references public.lugares (id) on delete cascade,
  primary key (dispositivo_id, lugar_id)
);
create index dispositivos_lugares_lugar_idx on public.dispositivos_lugares (lugar_id);
