-- Pruebas de RLS y reglas de reportes. No dejan rastro: todo ocurre en un solo bloque que
-- termina con una excepción a propósito, así que Postgres revierte usuarios, reportes y fotos de prueba.
-- Resultado esperado: un error cuyo mensaje empieza con "PRUEBAS_OK". Cualquier otro mensaje es una falla.
--   npx supabase db query --remote --yes -f supabase/pruebas/rls.sql

create function pg_temp.afirmar(condicion boolean, prueba text) returns void language plpgsql as $$
begin
  if condicion is not true then
    raise exception 'FALLA: %', prueba;
  end if;
end;
$$;

-- Cambia la identidad como lo hace la API: rol de Postgres y claims del JWT.
create function pg_temp.como(usuario uuid) returns void language plpgsql as $$
begin
  execute 'reset role';
  if usuario is null then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    execute 'set local role anon';
  else
    perform set_config('request.jwt.claims', json_build_object('sub', usuario, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
  end if;
end;
$$;

-- Espera que la sentencia falle.
create function pg_temp.falla(sentencia text, prueba text) returns void language plpgsql as $$
begin
  execute sentencia;
  raise exception 'FALLA: % (la sentencia no falló)', prueba;
exception
  when others then
    if sqlerrm like 'FALLA:%' then raise; end if;
end;
$$;

do $$
declare
  a constant uuid := '00000000-0000-4000-8000-00000000000a';
  b constant uuid := '00000000-0000-4000-8000-00000000000b';
  adm constant uuid := '00000000-0000-4000-8000-0000000000ad';
  hoy constant date := (now() at time zone 'America/Merida')::date;
  -- San Manuel (M4) tiene recolección martes, jueves y sábado (isodow 2, 4 y 6).
  dia_ok constant date := (select max(d)::date from generate_series(hoy - 6, hoy - 1, interval '1 day') d
                           where extract(isodow from d) in (2, 4, 6));
  dia_sin constant date := (select max(d)::date from generate_series(hoy - 7, hoy - 1, interval '1 day') d
                            where extract(isodow from d) = 1);
  rep_a uuid;
  rep_b uuid;
  n int;
  t text;
  pruebas int := 0;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prueba-a@carmen-limpio.test', '{}', '{}', now(), now()),
    (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prueba-b@carmen-limpio.test', '{}', '{}', now(), now()),
    (adm, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prueba-admin@carmen-limpio.test', '{}', '{}', now(), now());

  perform pg_temp.afirmar((select count(*) from public.perfiles where id in (a, b, adm) and rol = 'ciudadano') = 3,
    'toda cuenta nueva nace ciudadana');
  update public.perfiles set rol = 'administrador' where id = adm;

  insert into public.avisos (titulo, texto, publicado, creado_por, imagen, imagen_alt) values
    ('Aviso publicado', 'Texto de prueba publicado', true, adm, 'prueba/publicada.jpg', 'Cartel de prueba'),
    ('Borrador', 'Texto de prueba sin publicar', false, adm, 'prueba/borrador.jpg', 'Cartel de prueba');
  insert into storage.objects (bucket_id, name) values
    ('avisos-imagenes', 'prueba/publicada.jpg'), ('avisos-imagenes', 'prueba/borrador.jpg');
  perform pg_temp.falla('insert into public.avisos (titulo, texto, imagen) values (''Sin descripción'', ''Texto'', ''x.jpg'')',
    'una imagen de aviso exige descripción');

  -- Público sin cuenta ------------------------------------------------------
  perform pg_temp.como(null);
  perform pg_temp.afirmar((select count(*) from public.rutas) = 15, 'público: 15 rutas');
  perform pg_temp.afirmar((select count(*) from public.horarios) > 100, 'público: ve los horarios');
  perform pg_temp.afirmar((select count(*) from public.lugares where ubicacion is null) > 0, 'público: lugares sin ubicar siguen visibles');
  perform pg_temp.afirmar((select count(*) from public.tramos_ruta where escenario = 'carteles') = 30, 'público: ve trazos de carteles');
  perform pg_temp.afirmar((select count(*) from public.tramos_ruta where escenario = 'propuesta') = 0, 'público: no ve la propuesta');
  perform pg_temp.afirmar((select count(*) from public.recorridos_ruta) = 0, 'público: no ve recorridos de la propuesta');
  perform pg_temp.afirmar((select count(*) from public.tramos_geojson where escenario = 'propuesta') = 0, 'público: la vista no filtra la propuesta');
  perform pg_temp.afirmar(jsonb_array_length(public.trazado('carteles') -> 'features') = 30, 'público: trazado carteles en GeoJSON');
  perform pg_temp.falla('select public.trazado(''propuesta'')', 'público: pedir la propuesta debe fallar');
  perform pg_temp.afirmar((select count(*) from public.avisos where imagen like 'prueba/%') = 1, 'público: solo avisos publicados');
  perform pg_temp.afirmar((select count(*) from storage.objects where bucket_id = 'avisos-imagenes' and name like 'prueba/%') = 1,
    'público: solo ve la imagen del aviso publicado');
  perform pg_temp.afirmar((select count(*) from public.unidades) = 0, 'público: no ve unidades');
  perform pg_temp.afirmar((select count(*) from public.reportes) = 0, 'público: no ve reportes');
  perform pg_temp.falla(format('insert into public.reportes (autor, tipo, lugar_id, fecha) values (%L, ''noPaso'', ''san-manuel'', %L)', a, hoy),
    'público: no puede reportar');
  perform pg_temp.falla('insert into public.avisos (titulo, texto) values (''x'', ''xxxx'')', 'público: no puede crear avisos');
  perform pg_temp.falla('select 1 from public.reportes_detalle', 'público: no lee la vista de reportes');
  perform pg_temp.falla('select public.aceptar_privacidad(''v1'')', 'público: no acepta el aviso sin cuenta');
  perform pg_temp.falla('select public.eliminar_mi_cuenta()', 'público: no elimina cuentas');
  pruebas := pruebas + 19;

  -- Ciudadano A ---------------------------------------------------------------
  perform pg_temp.como(a);
  perform pg_temp.afirmar(not public.es_admin(), 'A: no es administrador');
  perform pg_temp.falla(format('insert into public.reportes (tipo, lugar_id, fecha) values (''noPaso'', ''san-manuel'', %L)', dia_ok),
    'A: no reporta sin aceptar el aviso de privacidad');
  perform public.aceptar_privacidad('prueba-v1');
  perform pg_temp.afirmar((select privacidad_version from public.perfiles where id = a) = 'prueba-v1', 'A: queda la versión aceptada');
  perform pg_temp.afirmar((select privacidad_aceptada from public.perfiles where id = a) is not null, 'A: queda la fecha de aceptación');
  insert into public.reportes (tipo, lugar_id, fecha) values ('noPaso', 'san-manuel', dia_ok) returning id into rep_a;
  select estado::text into t from public.reportes where id = rep_a;
  perform pg_temp.afirmar(t = 'recibido', 'A: el reporte nace Recibido');
  perform pg_temp.afirmar((select count(*) from public.historial_reportes where reporte_id = rep_a) = 1, 'A: historial inicial');
  perform pg_temp.afirmar((select nota from public.reportes where id = rep_a) <> '', 'A: nota visible desde el inicio');
  perform pg_temp.falla(format('insert into public.reportes (tipo, lugar_id, fecha) values (''noPaso'', ''san-manuel'', %L)', dia_ok),
    'A: no repite el mismo "no pasó"');
  perform pg_temp.falla(format('insert into public.reportes (tipo, lugar_id, fecha) values (''noPaso'', ''san-manuel'', %L)', dia_sin),
    'A: no reporta "no pasó" en un día sin recolección');
  perform pg_temp.falla(format('insert into public.reportes (autor, tipo, lugar_id, fecha) values (%L, ''noPaso'', ''obrera'', %L)', b, hoy),
    'A: no reporta a nombre de B');
  perform pg_temp.falla(format('insert into public.reportes (tipo, lugar_id, fecha) values (''noPaso'', ''obrera'', %L)', hoy + 1),
    'A: no reporta fechas futuras');
  perform pg_temp.falla(format(
    'insert into public.reportes (tipo, ubicacion, descripcion, foto) values (''tiradero'', extensions.st_setsrid(extensions.st_point(-91.8, 18.65), 4326), ''Bolsas en el terreno baldío'', %L)',
    b || '/foto.jpg'), 'A: no usa fotos de la carpeta de B');
  perform pg_temp.falla('insert into public.reportes (tipo, descripcion) values (''acumulacion'', ''corto'')', 'A: acumulación exige lugar o punto y descripción');
  update public.reportes set estado = 'atendido', nota = 'Me lo atiendo solo' where id = rep_a;
  get diagnostics n = row_count;
  perform pg_temp.afirmar(n = 0, 'A: no cambia el estado de su reporte');
  update public.perfiles set rol = 'administrador' where id = a;
  get diagnostics n = row_count;
  perform pg_temp.afirmar(n = 0, 'A: no se asciende a administrador');
  perform pg_temp.afirmar((select count(*) from public.incidencias) = 0, 'A: no ve incidencias');
  perform pg_temp.afirmar((select count(*) from public.tramos_ruta where escenario = 'propuesta') = 0, 'A: no ve la propuesta');
  update public.horarios set dias = '{lunes}' where lugar_id = 'san-manuel';
  get diagnostics n = row_count;
  perform pg_temp.afirmar(n = 0, 'A: no cambia horarios');
  perform pg_temp.falla('insert into public.lugares (id, nombre, tipo) values (''intruso'', ''Intruso'', ''colonia'')',
    'A: no crea lugares');
  update public.unidades set placas = 'XXX' where numero = 1;
  get diagnostics n = row_count;
  perform pg_temp.afirmar(n = 0, 'A: no cambia unidades');
  delete from public.asignaciones;
  get diagnostics n = row_count;
  perform pg_temp.afirmar(n = 0, 'A: no borra asignaciones');

  insert into storage.objects (bucket_id, name, owner) values ('fotos-reportes', a || '/foto.jpg', a);
  perform pg_temp.falla(format('insert into storage.objects (bucket_id, name, owner) values (''fotos-reportes'', %L, %L)', b || '/intruso.jpg', a),
    'A: no sube a la carpeta de B');
  perform pg_temp.falla('insert into storage.objects (bucket_id, name) values (''avisos-imagenes'', ''falsa.jpg'')',
    'A: no sube imágenes de avisos');
  perform pg_temp.afirmar((select count(*) from storage.objects where bucket_id = 'avisos-imagenes' and name like 'prueba/%') = 1,
    'A: no ve la imagen del borrador');

  insert into public.reportes (tipo, ubicacion, descripcion, foto)
  values ('tiradero', extensions.st_setsrid(extensions.st_point(-91.8, 18.65), 4326), 'Bolsas en el terreno baldío', a || '/foto.jpg');
  perform pg_temp.afirmar((select round(lng::numeric, 4) = -91.8 and round(lat::numeric, 4) = 18.65
                           from public.reportes_detalle where tipo = 'tiradero'), 'A: la vista da longitud y latitud');
  perform pg_temp.afirmar((select count(*) from public.reportes_detalle) = 2, 'A: la vista muestra sus reportes');

  -- Límite de envíos: ya tiene 2; 8 más llegan al límite de 10 y el siguiente falla.
  for i in 1..8 loop
    insert into public.reportes (tipo, lugar_id, descripcion) values ('acumulacion', 'obrera', 'Basura acumulada en la esquina ' || i);
  end loop;
  perform pg_temp.falla('insert into public.reportes (tipo, lugar_id, descripcion) values (''acumulacion'', ''obrera'', ''Uno más de la cuenta'')',
    'A: límite de 10 reportes en 24 horas');
  pruebas := pruebas + 28;

  -- Ciudadano B -----------------------------------------------------------------
  perform pg_temp.como(b);
  perform pg_temp.afirmar((select count(*) from public.reportes) = 0, 'B: no ve reportes de A');
  perform pg_temp.afirmar((select count(*) from public.historial_reportes) = 0, 'B: no ve historial de A');
  perform pg_temp.afirmar((select count(*) from storage.objects where bucket_id = 'fotos-reportes') = 0, 'B: no ve la foto de A');
  perform pg_temp.afirmar((select count(*) from public.reportes_detalle) = 0, 'B: la vista no muestra reportes de A');
  perform public.aceptar_privacidad('prueba-v1');
  insert into public.reportes (tipo, lugar_id, fecha) values ('noPaso', 'san-manuel', dia_ok) returning id into rep_b;
  perform pg_temp.afirmar((select count(*) from public.reportes) = 1, 'B: ve solo su reporte');
  perform pg_temp.afirmar((select privacidad_version from public.perfiles where id = a) is null, 'B: no ve el perfil de A');
  pruebas := pruebas + 6;

  -- Administración --------------------------------------------------------------
  perform pg_temp.como(adm);
  perform pg_temp.afirmar(public.es_admin(), 'admin: es administrador');
  perform pg_temp.afirmar((select count(*) from public.reportes where autor in (a, b)) = 11, 'admin: ve todos los reportes');
  perform pg_temp.afirmar((select count(*) from public.reportes_detalle where autor in (a, b)) = 11, 'admin: la vista muestra todos los reportes');
  perform pg_temp.falla('select public.eliminar_mi_cuenta()', 'admin: no elimina su cuenta desde la app');
  perform pg_temp.afirmar((select count(distinct incidencia_id) from public.reportes where id in (rep_a, rep_b)) = 1,
    'admin: dos "no pasó" iguales forman una incidencia');
  perform pg_temp.afirmar((select count(*) from public.reportes where id in (rep_a, rep_b) and incidencia_id is not null) = 2,
    'admin: la incidencia conserva a cada persona');
  perform pg_temp.afirmar((select count(*) from public.tramos_ruta where escenario = 'propuesta') = 45, 'admin: ve la propuesta');
  perform pg_temp.afirmar(jsonb_array_length(public.trazado('propuesta') -> 'features') = 45, 'admin: trazado propuesta en GeoJSON');
  perform pg_temp.afirmar((select count(*) from public.unidades) = 8, 'admin: 8 unidades');
  perform pg_temp.afirmar((select count(*) from public.asignaciones where desde <= hoy and (hasta is null or hasta >= hoy)) = 15,
    'admin: 15 asignaciones vigentes');
  perform pg_temp.afirmar((select count(*) from public.avisos where imagen like 'prueba/%') = 2, 'admin: ve borradores');
  perform pg_temp.afirmar((select count(*) from storage.objects where bucket_id = 'avisos-imagenes' and name like 'prueba/%') = 2,
    'admin: ve las imágenes de los borradores');
  insert into storage.objects (bucket_id, name) values ('avisos-imagenes', 'prueba/nueva.jpg');
  perform pg_temp.afirmar((select count(*) from storage.objects where bucket_id = 'fotos-reportes' and name = a || '/foto.jpg') = 1, 'admin: ve la foto');
  perform pg_temp.falla(format('update public.reportes set estado = ''atendido'', nota = ''Saltando pasos'' where id = %L', rep_a),
    'admin: no salta de Recibido a Atendido');
  perform pg_temp.falla(format('update public.reportes set estado = ''enRevision'' where id = %L', rep_a),
    'admin: cada cambio de estado lleva nota');
  perform pg_temp.falla(format('update public.reportes set descripcion = ''otra'' where id = %L', rep_a),
    'admin: no reescribe lo que reportó el ciudadano');
  update public.reportes set estado = 'enRevision', nota = 'Lo estamos revisando.' where id = rep_a;
  update public.reportes set estado = 'atendido', nota = 'El equipo del proyecto lo marcó como atendido (demostración).' where id = rep_a;
  perform pg_temp.afirmar((select count(*) from public.historial_reportes where reporte_id = rep_a) = 3, 'admin: cada cambio queda en el historial');
  perform pg_temp.falla(format('insert into public.asignaciones (unidad, ruta_id, desde) values (8, ''M1'', %L)', hoy),
    'admin: una ruta no tiene dos unidades a la vez');
  insert into public.lugares (id, nombre, tipo) values ('prueba-panel', 'Prueba del panel', 'colonia');
  insert into public.horarios (lugar_id, ruta_id, dias, inicio, fin, confianza)
  values ('prueba-panel', 'M1', '{lunes,miercoles}', '07:00', '15:00', 'ninguna');
  update public.horarios set dias = '{martes}' where lugar_id = 'prueba-panel';
  perform pg_temp.afirmar((select dias from public.horarios where lugar_id = 'prueba-panel') = '{martes}',
    'admin: cambia un horario');
  perform pg_temp.falla('update public.horarios set dias = ''{}'' where lugar_id = ''prueba-panel''',
    'admin: un horario necesita al menos un día');
  update public.unidades set placas = 'PRUEBA-1' where numero = 1;
  perform pg_temp.afirmar((select placas from public.unidades where numero = 1) = 'PRUEBA-1', 'admin: cambia placas');
  pruebas := pruebas + 21;

  -- A ve el nuevo estado y la nota ------------------------------------------------
  perform pg_temp.como(a);
  perform pg_temp.afirmar((select dias from public.horarios where lugar_id = 'prueba-panel') = '{martes}',
    'A: ve el horario que cambió administración');
  perform pg_temp.afirmar((select estado::text from public.reportes where id = rep_a) = 'atendido', 'A: ve el nuevo estado');
  perform pg_temp.afirmar((select nota from public.reportes where id = rep_a) like 'El equipo del proyecto%', 'A: ve la nota');
  perform pg_temp.afirmar((select count(*) from public.historial_reportes where reporte_id = rep_a) = 3, 'A: ve su historial completo');
  pruebas := pruebas + 4;

  -- B elimina su cuenta -------------------------------------------------------------
  perform pg_temp.como(b);
  perform public.eliminar_mi_cuenta();
  execute 'reset role';
  perform pg_temp.afirmar(not exists (select 1 from auth.users where id = b), 'B: su cuenta se elimina');
  perform pg_temp.afirmar(not exists (select 1 from public.reportes where autor = b), 'B: sus reportes se eliminan');
  perform pg_temp.afirmar(exists (select 1 from public.reportes where id = rep_a), 'B: el reporte de A sigue');
  perform pg_temp.afirmar(exists (select 1 from auth.users where id = a), 'B: la cuenta de A sigue');
  pruebas := pruebas + 4;

  execute 'reset role';
  raise exception 'PRUEBAS_OK: % comprobaciones pasaron (todo se revirtió)', pruebas;
end;
$$;
