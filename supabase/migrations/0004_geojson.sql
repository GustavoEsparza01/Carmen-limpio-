-- Geometría expuesta como GeoJSON. security_invoker hace que las vistas respeten la RLS de quien consulta:
-- el público solo recibe el escenario carteles.

create view public.lugares_geojson with (security_invoker = true) as
select l.id, l.nombre, l.tipo, l.confianza,
       extensions.st_asgeojson(l.ubicacion)::jsonb as geometria
from public.lugares l;

create view public.tramos_geojson with (security_invoker = true) as
select t.id, t.escenario, t.ruta_id, r.turno, r.numero, t.tramo, t.km, r.validada,
       extensions.st_asgeojson(t.geom)::jsonb as geometria
from public.tramos_ruta t
join public.rutas r on r.id = t.ruta_id;

create view public.paradas_geojson with (security_invoker = true) as
select p.id, p.escenario, p.ruta_id, p.orden, p.lugar_id, l.nombre as lugar, p.confianza,
       extensions.st_asgeojson(p.geom)::jsonb as geometria
from public.paradas_ruta p
join public.lugares l on l.id = p.lugar_id;

create view public.recorridos_geojson with (security_invoker = true) as
select c.escenario, c.ruta_id, r.turno, r.numero,
       extensions.st_asgeojson(c.geom)::jsonb as geometria
from public.recorridos_ruta c
join public.rutas r on r.id = c.ruta_id;

grant select on public.lugares_geojson, public.tramos_geojson, public.paradas_geojson,
  public.recorridos_geojson to anon, authenticated;

-- FeatureCollection lista para el mapa. Pedir la propuesta sin ser administrador es un error, no una lista vacía.
create function public.trazado(p_escenario public.escenario default 'carteles')
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_escenario = 'propuesta' and not public.es_admin() then
    raise exception 'La propuesta solo está disponible para administración' using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    'type', 'FeatureCollection',
    'ilustrativo', true,
    'features', coalesce((
      select jsonb_agg(jsonb_build_object(
        'type', 'Feature',
        'geometry', t.geometria,
        'properties', jsonb_build_object(
          'ruta', t.ruta_id, 'turno', t.turno, 'numero', t.numero,
          'tramo', t.tramo, 'km', t.km, 'validada', t.validada)
      ) order by t.ruta_id, t.id)
      from public.tramos_geojson t
      where t.escenario = p_escenario
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.trazado(public.escenario) to anon, authenticated;
