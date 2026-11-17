-- Email verification support for Supabase Auth. Public profile never stores email.
-- Run this migration in Supabase SQL Editor after the earlier migrations.
create or replace function public.handle_loki_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_birth_date date;
begin
  insert into public.profiles(id, nickname, status, activity_tier)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'nickname'), ''), '신규정보원'),
    'pending',
    '신입'
  );

  if nullif(new.raw_user_meta_data->>'birth_date', '') is not null then
    v_birth_date := (new.raw_user_meta_data->>'birth_date')::date;
    insert into public.private_birthdates(user_id, birth_date)
    values (new.id, v_birth_date)
    on conflict (user_id) do update set birth_date = excluded.birth_date;
  end if;
  return new;
end;
$$;

-- Supabase Auth email confirmation must be enabled in Authentication > Providers > Email.
