alter table tramos_ruta drop constraint tramos_ruta_tramo_check;
alter table tramos_ruta add constraint tramos_ruta_tramo_check
  check (tramo in ('servicio', 'traslado', 'repaso', 'acceso'));

-- Orden completo del camión: sirve para el simulador y la futura comparación con GPS.
create table recorridos_ruta (
  ruta_id text primary key references rutas (id) on delete cascade,
  geom geometry(LineString, 4326) not null
);
