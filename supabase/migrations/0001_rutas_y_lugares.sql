-- Catálogo de consulta: rutas, lugares, horarios y trazados.
-- Los datos vienen de carteles aportados por el usuario, sin validación oficial.

create extension if not exists postgis with schema extensions;
create extension if not exists btree_gist with schema extensions;

create type public.turno as enum ('matutino', 'vespertino');
create type public.dia_semana as enum ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo');
create type public.tipo_lugar as enum ('colonia', 'fraccionamiento', 'avenida', 'calle', 'privada', 'otro');
create type public.confianza as enum ('alta', 'media', 'baja', 'ninguna');
-- carteles: corredor que une los lugares de cada ruta real (app ciudadana).
-- propuesta: diseño propio de cobertura (panel y demostración). M1, V1... no significan lo mismo en ambos.
create type public.escenario as enum ('carteles', 'propuesta');
create type public.tipo_tramo as enum ('servicio', 'traslado', 'repaso', 'acceso');

create table public.rutas (
  id text primary key,
  turno public.turno not null,
  numero smallint not null check (numero between 1 and 8),
  validada boolean not null default false,
  unique (turno, numero),
  check (id = (case turno when 'matutino' then 'M' else 'V' end) || numero)
);
comment on table public.rutas is 'Recorridos de los carteles. validada = false mientras no haya validación oficial.';

create table public.lugares (
  id text primary key,
  nombre text not null unique,
  tipo public.tipo_lugar not null,
  -- Mejor confianza entre sus rutas. Un lugar sin ubicar conserva su horario: solo le falta el mapa.
  confianza public.confianza not null default 'ninguna',
  ubicacion extensions.geometry(Point, 4326),
  check ((ubicacion is null) = (confianza = 'ninguna'))
);
create index lugares_ubicacion_idx on public.lugares using gist (ubicacion);

-- Liga lugar, ruta, días y turno. Un lugar puede estar en dos rutas con días distintos.
create table public.horarios (
  id bigint generated always as identity primary key,
  lugar_id text not null references public.lugares (id) on delete cascade,
  ruta_id text not null references public.rutas (id) on delete cascade,
  dias public.dia_semana[] not null check (cardinality(dias) > 0),
  -- Ventana del turno, nunca una hora exacta de llegada. Hora de America/Merida.
  inicio time not null,
  fin time not null check (fin > inicio),
  -- Confianza de la ubicación del lugar dentro de esta ruta.
  confianza public.confianza not null,
  por_confirmar boolean not null default false,
  nota text,
  unique (lugar_id, ruta_id)
);
create index horarios_ruta_idx on public.horarios (ruta_id);

create table public.tramos_ruta (
  id bigint generated always as identity primary key,
  escenario public.escenario not null,
  ruta_id text not null references public.rutas (id) on delete cascade,
  tramo public.tipo_tramo not null,
  km numeric(6, 1) not null check (km >= 0),
  geom extensions.geometry(MultiLineString, 4326) not null,
  check (escenario = 'propuesta' or tramo in ('servicio', 'traslado'))
);
create index tramos_ruta_escenario_idx on public.tramos_ruta (escenario, ruta_id);
create index tramos_ruta_geom_idx on public.tramos_ruta using gist (geom);

-- Orden completo del camión: sirve para el simulador y la futura comparación con GPS.
create table public.recorridos_ruta (
  escenario public.escenario not null,
  ruta_id text not null references public.rutas (id) on delete cascade,
  geom extensions.geometry(LineString, 4326) not null,
  primary key (escenario, ruta_id)
);

-- Un lugar lineal (una avenida) puede tener dos puntos en la misma ruta.
create table public.paradas_ruta (
  id bigint generated always as identity primary key,
  escenario public.escenario not null,
  ruta_id text not null references public.rutas (id) on delete cascade,
  orden smallint not null,
  lugar_id text not null references public.lugares (id) on delete cascade,
  confianza public.confianza not null check (confianza <> 'ninguna'),
  geom extensions.geometry(Point, 4326) not null,
  unique (escenario, ruta_id, orden)
);
create index paradas_ruta_lugar_idx on public.paradas_ruta (lugar_id);
create index paradas_ruta_geom_idx on public.paradas_ruta using gist (geom);
