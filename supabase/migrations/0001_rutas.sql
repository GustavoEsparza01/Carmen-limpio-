create extension if not exists postgis;

create table rutas (
  id text primary key,
  turno text not null check (turno in ('matutino', 'vespertino')),
  numero int not null,
  validada boolean not null default false,
  unique (turno, numero)
);

create table tramos_ruta (
  id bigint generated always as identity primary key,
  ruta_id text not null references rutas (id) on delete cascade,
  tramo text not null check (tramo in ('servicio', 'traslado')),
  km numeric(6, 1) not null,
  geom geometry(MultiLineString, 4326) not null
);
create index tramos_ruta_geom_idx on tramos_ruta using gist (geom);

create table paradas_ruta (
  id bigint generated always as identity primary key,
  ruta_id text not null references rutas (id) on delete cascade,
  orden int not null,
  lugar text not null,
  confianza text not null check (confianza in ('alta', 'media', 'baja')),
  geom geometry(Point, 4326) not null,
  unique (ruta_id, orden)
);
create index paradas_ruta_geom_idx on paradas_ruta using gist (geom);
