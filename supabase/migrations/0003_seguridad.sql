-- RLS activa en todas las tablas.
-- Público: lugares, rutas, horarios, avisos publicados y trazados del escenario carteles.
-- Ciudadano: crea y lee solo sus reportes. Administrador: gestión completa, comprobada con es_admin().

alter table public.rutas enable row level security;
alter table public.lugares enable row level security;
alter table public.horarios enable row level security;
alter table public.tramos_ruta enable row level security;
alter table public.recorridos_ruta enable row level security;
alter table public.paradas_ruta enable row level security;
alter table public.perfiles enable row level security;
alter table public.unidades enable row level security;
alter table public.asignaciones enable row level security;
alter table public.avisos enable row level security;
alter table public.avisos_lugares enable row level security;
alter table public.incidencias enable row level security;
alter table public.reportes enable row level security;
alter table public.historial_reportes enable row level security;
alter table public.posiciones_unidad enable row level security;
alter table public.dispositivos enable row level security;
alter table public.dispositivos_lugares enable row level security;

-- Permisos explícitos: no dependen de los permisos por omisión del proyecto.
grant usage on schema public to anon, authenticated;
grant select on public.rutas, public.lugares, public.horarios, public.tramos_ruta,
  public.recorridos_ruta, public.paradas_ruta, public.avisos, public.avisos_lugares,
  public.posiciones_unidad to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.historial_reportes, public.perfiles from authenticated;
grant update (rol, nombre) on public.perfiles to authenticated;
grant usage on all sequences in schema public to authenticated;
revoke execute on function public.crear_perfil(), public.preparar_reporte(),
  public.validar_cambio_reporte(), public.registrar_historial_reporte() from public, anon, authenticated;

-- Catálogo ------------------------------------------------------------------

create policy "lectura pública" on public.rutas for select to anon, authenticated using (true);
create policy "lectura pública" on public.lugares for select to anon, authenticated using (true);
create policy "lectura pública" on public.horarios for select to anon, authenticated using (true);

create policy "administración" on public.rutas for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "administración" on public.lugares for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "administración" on public.horarios for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- La propuesta nunca se muestra a un ciudadano como si fuera su ruta.
create policy "carteles públicos" on public.tramos_ruta for select to anon, authenticated
  using (escenario = 'carteles' or (select public.es_admin()));
create policy "carteles públicos" on public.recorridos_ruta for select to anon, authenticated
  using (escenario = 'carteles' or (select public.es_admin()));
create policy "carteles públicos" on public.paradas_ruta for select to anon, authenticated
  using (escenario = 'carteles' or (select public.es_admin()));

create policy "administración" on public.tramos_ruta for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "administración" on public.recorridos_ruta for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "administración" on public.paradas_ruta for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- Perfiles ------------------------------------------------------------------

create policy "propio o administración" on public.perfiles for select to authenticated
  using (id = (select auth.uid()) or (select public.es_admin()));
-- Solo un administrador cambia roles: un ciudadano no puede ascenderse.
create policy "administración" on public.perfiles for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- Operación (solo administración) -------------------------------------------

create policy "administración" on public.unidades for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "administración" on public.asignaciones for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "administración" on public.incidencias for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- Avisos --------------------------------------------------------------------

create policy "publicados" on public.avisos for select to anon, authenticated
  using (publicado or (select public.es_admin()));
create policy "administración" on public.avisos for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

create policy "de avisos visibles" on public.avisos_lugares for select to anon, authenticated
  using (exists (select 1 from public.avisos a where a.id = aviso_id and (a.publicado or (select public.es_admin()))));
create policy "administración" on public.avisos_lugares for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- Reportes ------------------------------------------------------------------

create policy "propios o administración" on public.reportes for select to authenticated
  using (autor = (select auth.uid()) or (select public.es_admin()));
create policy "crear propios" on public.reportes for insert to authenticated
  with check (autor = (select auth.uid()));
create policy "administración" on public.reportes for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

create policy "de reportes visibles" on public.historial_reportes for select to authenticated
  using (exists (
    select 1 from public.reportes r
    where r.id = reporte_id and (r.autor = (select auth.uid()) or (select public.es_admin()))
  ));

-- Posiciones: el público solo ve la simulación ---------------------------------

create policy "simulación pública" on public.posiciones_unidad for select to anon, authenticated
  using (origen = 'simulacion' or (select public.es_admin()));
create policy "administración" on public.posiciones_unidad for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- Dispositivos --------------------------------------------------------------

create policy "propios" on public.dispositivos for all to authenticated
  using (usuario = (select auth.uid())) with check (usuario = (select auth.uid()));
create policy "administración lee" on public.dispositivos for select to authenticated
  using ((select public.es_admin()));

create policy "propios" on public.dispositivos_lugares for all to authenticated
  using (exists (select 1 from public.dispositivos d where d.id = dispositivo_id and d.usuario = (select auth.uid())))
  with check (exists (select 1 from public.dispositivos d where d.id = dispositivo_id and d.usuario = (select auth.uid())));
create policy "administración lee" on public.dispositivos_lugares for select to authenticated
  using ((select public.es_admin()));

-- Fotos de reportes: bucket privado, URLs firmadas ----------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-reportes', 'fotos-reportes', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "fotos: subir propias" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos-reportes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fotos: leer propias o administración" on storage.objects for select to authenticated
  using (bucket_id = 'fotos-reportes'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.es_admin())));
create policy "fotos: borrar administración" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos-reportes' and (select public.es_admin()));
