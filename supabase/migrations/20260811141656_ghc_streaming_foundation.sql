create table if not exists public.lesson_media_assets (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  media_kind text not null default 'video' check (media_kind in ('video','audio','live')),
  delivery_protocol text not null default 'file' check (delivery_protocol in ('file','hls','dash','embed','webrtc')),
  provider text not null default 'custom',
  provider_asset_id text,
  playback_reference text,
  playback_url text,
  storage_bucket text,
  storage_path text,
  poster_url text,
  status text not null default 'draft' check (status in ('draft','processing','ready','scheduled','live','ended','error','archived')),
  is_primary boolean not null default true,
  requires_signed_playback boolean not null default true,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_media_assets_lesson_idx
  on public.lesson_media_assets(lesson_id, status, media_kind);
create index if not exists lesson_media_assets_course_idx
  on public.lesson_media_assets(course_id, status);
create unique index if not exists lesson_media_assets_primary_unique
  on public.lesson_media_assets(lesson_id, media_kind)
  where is_primary = true and status <> 'archived';

alter table public.lesson_media_assets enable row level security;
revoke all on table public.lesson_media_assets from public, anon, authenticated;

create or replace function public.ghc_guard_lesson_media_asset()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_module_id uuid;
  v_course_id uuid;
begin
  select l.module_id, m.course_id
  into v_module_id, v_course_id
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where l.id = new.lesson_id;

  if v_module_id is null or v_course_id is null then
    raise exception 'La lección indicada no existe o no pertenece a un curso válido.';
  end if;

  new.module_id := v_module_id;
  new.course_id := v_course_id;
  new.provider := lower(trim(coalesce(new.provider, 'custom')));
  new.media_kind := lower(trim(coalesce(new.media_kind, 'video')));
  new.delivery_protocol := lower(trim(coalesce(new.delivery_protocol, 'file')));
  new.status := lower(trim(coalesce(new.status, 'draft')));
  new.updated_at := now();

  if new.is_primary and new.status <> 'archived' then
    update public.lesson_media_assets
      set is_primary = false, updated_at = now()
    where lesson_id = new.lesson_id
      and media_kind = new.media_kind
      and id <> new.id
      and is_primary = true;
  end if;

  return new;
end;
$$;

revoke all on function public.ghc_guard_lesson_media_asset() from public, anon, authenticated;

drop trigger if exists ghc_guard_lesson_media_asset_before on public.lesson_media_assets;
create trigger ghc_guard_lesson_media_asset_before
before insert or update on public.lesson_media_assets
for each row execute function public.ghc_guard_lesson_media_asset();

create table if not exists public.stream_playback_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  asset_id uuid not null references public.lesson_media_assets(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  provider text not null,
  opened_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  last_seen_at timestamptz not null default now(),
  position_seconds integer not null default 0 check (position_seconds >= 0),
  max_position_seconds integer not null default 0 check (max_position_seconds >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  ended boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists stream_playback_sessions_user_idx
  on public.stream_playback_sessions(user_id, opened_at desc);
create index if not exists stream_playback_sessions_asset_idx
  on public.stream_playback_sessions(asset_id, opened_at desc);

alter table public.stream_playback_sessions enable row level security;
revoke all on table public.stream_playback_sessions from public, anon, authenticated;

create or replace function public.ghc_admin_upsert_lesson_media_asset(
  p_asset_id uuid,
  p_lesson_id uuid,
  p_media_kind text default 'video',
  p_delivery_protocol text default 'hls',
  p_provider text default 'custom',
  p_provider_asset_id text default null,
  p_playback_reference text default null,
  p_playback_url text default null,
  p_storage_bucket text default null,
  p_storage_path text default null,
  p_poster_url text default null,
  p_status text default 'draft',
  p_is_primary boolean default true,
  p_requires_signed_playback boolean default true,
  p_duration_seconds integer default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_user_id uuid := auth.uid();
  v_asset public.lesson_media_assets;
begin
  if v_user_id is null or not public.ghc_is_admin() then
    raise exception 'GHC admin permission required';
  end if;

  if p_lesson_id is null then
    raise exception 'lesson_id es obligatorio.';
  end if;

  if p_asset_id is null then
    insert into public.lesson_media_assets (
      course_id, module_id, lesson_id, media_kind, delivery_protocol, provider,
      provider_asset_id, playback_reference, playback_url, storage_bucket, storage_path,
      poster_url, status, is_primary, requires_signed_playback, duration_seconds,
      starts_at, ends_at, metadata, created_by, updated_by
    ) values (
      (select m.course_id from public.lessons l join public.modules m on m.id=l.module_id where l.id=p_lesson_id),
      (select l.module_id from public.lessons l where l.id=p_lesson_id),
      p_lesson_id, lower(coalesce(p_media_kind,'video')), lower(coalesce(p_delivery_protocol,'hls')),
      lower(coalesce(p_provider,'custom')), nullif(trim(coalesce(p_provider_asset_id,'')),''),
      nullif(trim(coalesce(p_playback_reference,'')),''), nullif(trim(coalesce(p_playback_url,'')),''),
      nullif(trim(coalesce(p_storage_bucket,'')),''), nullif(trim(coalesce(p_storage_path,'')),''),
      nullif(trim(coalesce(p_poster_url,'')),''), lower(coalesce(p_status,'draft')),
      coalesce(p_is_primary,true), coalesce(p_requires_signed_playback,true), p_duration_seconds,
      p_starts_at, p_ends_at, coalesce(p_metadata,'{}'::jsonb), v_user_id, v_user_id
    ) returning * into v_asset;
  else
    update public.lesson_media_assets
    set lesson_id = p_lesson_id,
        media_kind = lower(coalesce(p_media_kind, media_kind)),
        delivery_protocol = lower(coalesce(p_delivery_protocol, delivery_protocol)),
        provider = lower(coalesce(p_provider, provider)),
        provider_asset_id = nullif(trim(coalesce(p_provider_asset_id,'')),''),
        playback_reference = nullif(trim(coalesce(p_playback_reference,'')),''),
        playback_url = nullif(trim(coalesce(p_playback_url,'')),''),
        storage_bucket = nullif(trim(coalesce(p_storage_bucket,'')),''),
        storage_path = nullif(trim(coalesce(p_storage_path,'')),''),
        poster_url = nullif(trim(coalesce(p_poster_url,'')),''),
        status = lower(coalesce(p_status,status)),
        is_primary = coalesce(p_is_primary,is_primary),
        requires_signed_playback = coalesce(p_requires_signed_playback,requires_signed_playback),
        duration_seconds = p_duration_seconds,
        starts_at = p_starts_at,
        ends_at = p_ends_at,
        metadata = coalesce(p_metadata,metadata),
        updated_by = v_user_id,
        updated_at = now()
    where id = p_asset_id
    returning * into v_asset;

    if v_asset.id is null then
      raise exception 'No existe el media asset indicado.';
    end if;
  end if;

  return to_jsonb(v_asset);
end;
$$;

revoke all on function public.ghc_admin_upsert_lesson_media_asset(uuid,uuid,text,text,text,text,text,text,text,text,text,text,boolean,boolean,integer,timestamptz,timestamptz,jsonb) from public, anon;
grant execute on function public.ghc_admin_upsert_lesson_media_asset(uuid,uuid,text,text,text,text,text,text,text,text,text,text,boolean,boolean,integer,timestamptz,timestamptz,jsonb) to authenticated;

create or replace function public.ghc_admin_list_lesson_media_assets(p_lesson_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public'
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not public.ghc_is_admin() then
    raise exception 'GHC admin permission required';
  end if;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.is_primary desc, a.created_at desc), '[]'::jsonb)
  into v_result
  from public.lesson_media_assets a
  where a.lesson_id = p_lesson_id;

  return v_result;
end;
$$;

revoke all on function public.ghc_admin_list_lesson_media_assets(uuid) from public, anon;
grant execute on function public.ghc_admin_list_lesson_media_assets(uuid) to authenticated;

create or replace function public.ghc_admin_archive_lesson_media_asset(p_asset_id uuid)
returns boolean
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if auth.uid() is null or not public.ghc_is_admin() then
    raise exception 'GHC admin permission required';
  end if;

  update public.lesson_media_assets
  set status='archived', is_primary=false, updated_by=auth.uid(), updated_at=now()
  where id=p_asset_id;

  return found;
end;
$$;

revoke all on function public.ghc_admin_archive_lesson_media_asset(uuid) from public, anon;
grant execute on function public.ghc_admin_archive_lesson_media_asset(uuid) to authenticated;

create or replace function public.ghc_student_get_lesson_media(p_lesson_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public'
as $$
declare
  v_user_id uuid := auth.uid();
  v_access jsonb;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión como alumno.';
  end if;

  v_access := public.ghc_internal_student_lesson_access(v_user_id, p_lesson_id);
  if not coalesce((v_access->>'allowed')::boolean,false) then
    raise exception '%', coalesce(v_access->>'reason','No tienes acceso a esta lección.');
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',a.id,
      'course_id',a.course_id,
      'module_id',a.module_id,
      'lesson_id',a.lesson_id,
      'media_kind',a.media_kind,
      'delivery_protocol',a.delivery_protocol,
      'provider',a.provider,
      'provider_asset_id',a.provider_asset_id,
      'playback_reference',a.playback_reference,
      'playback_url',a.playback_url,
      'storage_bucket',a.storage_bucket,
      'storage_path',a.storage_path,
      'poster_url',a.poster_url,
      'status',a.status,
      'is_primary',a.is_primary,
      'requires_signed_playback',a.requires_signed_playback,
      'duration_seconds',a.duration_seconds,
      'starts_at',a.starts_at,
      'ends_at',a.ends_at
    ) order by
      case when a.status='live' then 0 when a.is_primary then 1 else 2 end,
      a.created_at desc
  ), '[]'::jsonb)
  into v_result
  from public.lesson_media_assets a
  where a.lesson_id = p_lesson_id
    and a.status in ('ready','scheduled','live');

  return v_result;
end;
$$;

revoke all on function public.ghc_student_get_lesson_media(uuid) from public, anon;
grant execute on function public.ghc_student_get_lesson_media(uuid) to authenticated;

create or replace function public.ghc_student_open_stream_session(p_asset_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_user_id uuid := auth.uid();
  v_asset public.lesson_media_assets;
  v_access jsonb;
  v_session public.stream_playback_sessions;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión como alumno.';
  end if;

  select * into v_asset
  from public.lesson_media_assets
  where id=p_asset_id and status in ('ready','scheduled','live');

  if v_asset.id is null then
    raise exception 'El recurso de streaming no está disponible.';
  end if;

  v_access := public.ghc_internal_student_lesson_access(v_user_id, v_asset.lesson_id);
  if not coalesce((v_access->>'allowed')::boolean,false) then
    raise exception '%', coalesce(v_access->>'reason','No tienes acceso a esta lección.');
  end if;

  insert into public.stream_playback_sessions(
    user_id,asset_id,course_id,lesson_id,provider,duration_seconds
  ) values (
    v_user_id,v_asset.id,v_asset.course_id,v_asset.lesson_id,v_asset.provider,v_asset.duration_seconds
  ) returning * into v_session;

  return jsonb_build_object(
    'session_id',v_session.id,
    'asset_id',v_asset.id,
    'expires_at',v_session.expires_at,
    'provider',v_asset.provider
  );
end;
$$;

revoke all on function public.ghc_student_open_stream_session(uuid) from public, anon;
grant execute on function public.ghc_student_open_stream_session(uuid) to authenticated;

create or replace function public.ghc_student_touch_stream_session(
  p_session_id uuid,
  p_position_seconds integer default 0,
  p_duration_seconds integer default null,
  p_ended boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.stream_playback_sessions;
  v_access jsonb;
  v_position integer := greatest(0,coalesce(p_position_seconds,0));
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión como alumno.';
  end if;

  select * into v_session
  from public.stream_playback_sessions
  where id=p_session_id and user_id=v_user_id;

  if v_session.id is null then
    raise exception 'Sesión de reproducción no encontrada.';
  end if;

  v_access := public.ghc_internal_student_lesson_access(v_user_id, v_session.lesson_id);
  if not coalesce((v_access->>'allowed')::boolean,false) then
    raise exception '%', coalesce(v_access->>'reason','No tienes acceso a esta lección.');
  end if;

  update public.stream_playback_sessions
  set last_seen_at=now(),
      position_seconds=v_position,
      max_position_seconds=greatest(max_position_seconds,v_position),
      duration_seconds=coalesce(p_duration_seconds,duration_seconds),
      ended=ended or coalesce(p_ended,false)
  where id=p_session_id and user_id=v_user_id;

  return found;
end;
$$;

revoke all on function public.ghc_student_touch_stream_session(uuid,integer,integer,boolean) from public, anon;
grant execute on function public.ghc_student_touch_stream_session(uuid,integer,integer,boolean) to authenticated;
