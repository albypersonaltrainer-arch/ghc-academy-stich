delete from public.courses
where slug='prueba-definitiva-cflgz'
  and status='archived'
  and not exists (select 1 from public.academy_orders o where o.course_id=public.courses.id)
  and not exists (select 1 from public.course_access a where a.course_id=public.courses.id)
  and not exists (select 1 from public.exam_attempts ea where ea.course_id=public.courses.id)
  and not exists (select 1 from public.certificates cert where cert.course_id=public.courses.id);
