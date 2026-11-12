-- Recomendación del revisor de Supabase: toda función con search_path fijo.
alter function public.limite_reportes_por_dia() set search_path = '';
