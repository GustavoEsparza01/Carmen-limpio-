-- Imagen opcional en los avisos. Bucket privado: la imagen de un aviso publicado la ve cualquiera,
-- la de un borrador solo administración, para que un aviso sin publicar no se filtre por su imagen.

alter table public.avisos
  add column imagen text,
  -- Descripción para lectores de pantalla: obligatoria si hay imagen.
  add column imagen_alt text check (char_length(imagen_alt) <= 300),
  add constraint avisos_imagen_con_descripcion
    check (imagen is null or char_length(trim(coalesce(imagen_alt, ''))) >= 3);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avisos-imagenes', 'avisos-imagenes', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "avisos-imagenes: leer publicadas o administración" on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'avisos-imagenes'
    and (
      exists (select 1 from public.avisos a where a.imagen = name and a.publicado)
      or (select public.es_admin())
    )
  );
create policy "avisos-imagenes: subir administración" on storage.objects for insert to authenticated
  with check (bucket_id = 'avisos-imagenes' and (select public.es_admin()));
create policy "avisos-imagenes: cambiar administración" on storage.objects for update to authenticated
  using (bucket_id = 'avisos-imagenes' and (select public.es_admin()))
  with check (bucket_id = 'avisos-imagenes' and (select public.es_admin()));
create policy "avisos-imagenes: borrar administración" on storage.objects for delete to authenticated
  using (bucket_id = 'avisos-imagenes' and (select public.es_admin()));
