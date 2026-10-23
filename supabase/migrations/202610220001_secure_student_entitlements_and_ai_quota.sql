-- Keep premium entitlements and free-tier quota counters server controlled.
-- Profile editing remains available for ordinary study preferences.
revoke insert, update on table public.profiles from authenticated;
grant insert (id, full_name, academic_level, subjects, degree_name, institution, study_year)
  on table public.profiles to authenticated;
grant update (id, full_name, academic_level, subjects, degree_name, institution, study_year)
  on table public.profiles to authenticated;

create table if not exists public.study_ai_usage_reservations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  quota_window timestamptz not null,
  counted_toward_free_limit boolean not null,
  status text not null check (status in ('reserved', 'completed', 'released')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists study_ai_usage_reservations_cleanup_idx
  on public.study_ai_usage_reservations (created_at)
  where status <> 'reserved';
alter table public.study_ai_usage_reservations enable row level security;
revoke all on table public.study_ai_usage_reservations from public, anon, authenticated;
grant all on table public.study_ai_usage_reservations to service_role;

create or replace function public.reserve_study_ai_request(target_user uuid, request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_row public.profiles%rowtype;
  premium_active boolean;
  next_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Server access required' using errcode = '42501';
  end if;
  if target_user is null or request_id is null then
    raise exception 'Invalid request' using errcode = '22023';
  end if;

  delete from public.study_ai_usage_reservations
   where id in (
     select id from public.study_ai_usage_reservations
      where status <> 'reserved' and created_at < now() - interval '30 days'
      order by created_at limit 500
   );

  select * into profile_row from public.profiles where id = target_user for update;
  if profile_row.id is null then
    raise exception 'Study profile not found' using errcode = 'P0002';
  end if;
  if exists(select 1 from public.study_ai_usage_reservations where id = request_id) then
    raise exception 'Request already reserved' using errcode = '23505';
  end if;

  select exists (
    select 1 from public.subscriptions s
     where s.user_id = target_user
       and (s.status = 'active' or (s.status = 'cancelled' and s.current_period_end > now()))
  ) into premium_active;

  if profile_row.last_reset <= now() - interval '24 hours' then
    update public.profiles set daily_tokens = 0, last_reset = now()
     where id = target_user returning * into profile_row;
  end if;

  if not premium_active and profile_row.daily_tokens >= 5 then
    return jsonb_build_object('allowed', false, 'premium', false, 'used', profile_row.daily_tokens, 'limit', 5);
  end if;

  next_count := profile_row.daily_tokens;
  if not premium_active then
    next_count := profile_row.daily_tokens + 1;
    update public.profiles set daily_tokens = next_count where id = target_user;
  end if;

  insert into public.study_ai_usage_reservations(id, user_id, quota_window, counted_toward_free_limit, status)
  values (request_id, target_user, profile_row.last_reset, not premium_active, 'reserved');

  return jsonb_build_object('allowed', true, 'premium', premium_active, 'used', next_count, 'limit', 5);
end;
$$;
revoke all on function public.reserve_study_ai_request(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reserve_study_ai_request(uuid, uuid) to service_role;

create or replace function public.finish_study_ai_request(target_user uuid, request_id uuid, completed boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare reservation public.study_ai_usage_reservations%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Server access required' using errcode = '42501';
  end if;
  select * into reservation from public.study_ai_usage_reservations
   where id = request_id and user_id = target_user for update;
  if reservation.id is null or reservation.status <> 'reserved' then return; end if;

  if not completed and reservation.counted_toward_free_limit then
    update public.profiles
       set daily_tokens = greatest(0, daily_tokens - 1)
     where id = target_user and last_reset = reservation.quota_window;
  end if;

  update public.study_ai_usage_reservations
     set status = case when completed then 'completed' else 'released' end,
         updated_at = now()
   where id = request_id;
end;
$$;
revoke all on function public.finish_study_ai_request(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.finish_study_ai_request(uuid, uuid, boolean) to service_role;
