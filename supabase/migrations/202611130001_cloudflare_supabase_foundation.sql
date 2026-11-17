-- LoKI database: Supabase PostgreSQL foundation for Cloudflare Pages.
-- Run once in Supabase SQL Editor. Never expose service_role or DB credentials in VITE_*.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname varchar(24) not null unique,
  bio text not null default '',
  avatar_url text not null default '',
  activity_tier text not null default '신입',
  status text not null default 'pending' check (status in ('pending','active','timeout','banned','rejected')),
  security_clearance smallint not null default 3 check (security_clearance between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Birth dates are isolated from public profile data.
create or replace function public.handle_loki_auth_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id,nickname,status,activity_tier)
  values(new.id, coalesce(new.raw_user_meta_data->>'nickname','익명회원'), 'pending', '신입');
  return new;
end $$;
drop trigger if exists on_loki_auth_user_created on auth.users;
create trigger on_loki_auth_user_created after insert on auth.users
for each row execute function public.handle_loki_auth_user();

create table if not exists public.private_birthdates (
  user_id uuid primary key references auth.users(id) on delete cascade,
  birth_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.forums (
  id uuid primary key default gen_random_uuid(),
  name varchar(60) not null,
  slug varchar(70) not null unique,
  description text not null default '',
  category text not null default '자유 포럼',
  icon text not null default 'MessageSquare',
  banner_url text not null default '',
  rules text not null default '',
  is_public boolean not null default true,
  is_deleted boolean not null default false,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  forum_id uuid references public.forums(id) on delete set null,
  author_id uuid not null references auth.users(id) on delete cascade,
  title varchar(200) not null,
  content text not null,
  leak_tag text not null check (leak_tag in ('유출 가능','유출 불가능')),
  secret_grade smallint not null default 5 check (secret_grade between 1 and 5),
  grade_set_by uuid references auth.users(id) on delete set null,
  grade_locked boolean not null default true,
  trust_level text not null default '중간' check (trust_level in ('높음','중간','낮음')),
  is_sensitive boolean not null default false,
  poll jsonb,
  is_pinned boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  image_url text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);
create table if not exists public.post_views (
  post_id uuid not null references public.posts(id) on delete cascade,
  viewer_key text not null,
  user_id uuid references auth.users(id) on delete set null,
  viewed_at timestamptz not null default now(),
  primary key(post_id,viewer_key)
);
create table if not exists public.forum_subscriptions (
  forum_id uuid not null references public.forums(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(forum_id,user_id)
);
create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.cs_readers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now()
);
create table if not exists public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.site_security_config (
  singleton boolean primary key default true check (singleton),
  level smallint not null default 1 check (level between 1 and 5),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.site_security_config(singleton,level) values(true,1) on conflict(singleton) do nothing;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts(created_at desc) where deleted_at is null;
create index if not exists posts_author_id_idx on public.posts(author_id);
create index if not exists posts_forum_id_idx on public.posts(forum_id);
create index if not exists comments_post_id_idx on public.comments(post_id);

alter table public.profiles enable row level security;
alter table public.private_birthdates enable row level security;
alter table public.forums enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_views enable row level security;
alter table public.forum_subscriptions enable row level security;
alter table public.admin_roles enable row level security;
alter table public.cs_readers enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.site_security_config enable row level security;

create or replace function public.is_forum_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admin_roles r where r.user_id = auth.uid()) $$;
revoke all on function public.is_forum_admin() from public;
grant execute on function public.is_forum_admin() to authenticated;

-- Profile reads reveal nickname/avatar/activity only. Birth date has its own owner-only table.
drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles for select using (true);
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin on public.profiles for update to authenticated using (id = auth.uid() or public.is_forum_admin()) with check (id = auth.uid() or public.is_forum_admin());
drop policy if exists birthdate_owner_read on public.private_birthdates;
create policy birthdate_owner_read on public.private_birthdates for select to authenticated using (user_id = auth.uid());
drop policy if exists birthdate_owner_insert on public.private_birthdates;
create policy birthdate_owner_insert on public.private_birthdates for insert to authenticated with check (user_id = auth.uid());

-- Admin roles are never self-assignable. The first admin must be provisioned manually in SQL.
drop policy if exists admin_roles_read_self_or_admin on public.admin_roles;
create policy admin_roles_read_self_or_admin on public.admin_roles for select to authenticated using (user_id = auth.uid() or public.is_forum_admin());
drop policy if exists cs_readers_read_self_or_admin on public.cs_readers;
create policy cs_readers_read_self_or_admin on public.cs_readers for select to authenticated using (user_id = auth.uid() or public.is_forum_admin());

-- Grade access: clearance 3 sees grades 3-5; clearance 2 sees 2-5; clearance 1 sees all.
-- CS (grade 1) is additionally available to explicitly approved CS readers and admins.
drop policy if exists forums_read_public_or_owner on public.forums;
create policy forums_read_public_or_owner on public.forums for select using ((is_public and not is_deleted) or owner_id = auth.uid() or public.is_forum_admin());
drop policy if exists forums_insert_auth on public.forums;
create policy forums_insert_auth on public.forums for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists forums_update_owner_admin on public.forums;
create policy forums_update_owner_admin on public.forums for update to authenticated using (owner_id = auth.uid() or public.is_forum_admin()) with check (owner_id = auth.uid() or public.is_forum_admin());

drop policy if exists posts_read_by_clearance on public.posts;
create policy posts_read_by_clearance on public.posts for select using (
  (deleted_at is null or public.is_forum_admin()) and (
    public.is_forum_admin() or (auth.uid() is null and secret_grade >= 4)
    or (auth.uid() is not null and secret_grade >= coalesce((select p.security_clearance from public.profiles p where p.id = auth.uid()), 3))
    or (secret_grade = 1 and exists(select 1 from public.cs_readers r where r.user_id = auth.uid()))
  )
);
drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own on public.posts for insert to authenticated with check (author_id = auth.uid() and grade_locked = true and grade_set_by = auth.uid());
drop policy if exists posts_update_author_or_admin on public.posts;
create policy posts_update_author_or_admin on public.posts for update to authenticated using (author_id = auth.uid() or public.is_forum_admin()) with check (author_id = auth.uid() or public.is_forum_admin());
drop policy if exists comments_read_visible_posts on public.comments;
create policy comments_read_visible_posts on public.comments for select using (deleted_at is null and exists(select 1 from public.posts p where p.id = post_id));
drop policy if exists comments_insert_own on public.comments;
create policy comments_insert_own on public.comments for insert to authenticated with check (author_id = auth.uid());
drop policy if exists comments_update_author_admin on public.comments;
create policy comments_update_author_admin on public.comments for update to authenticated using (author_id = auth.uid() or public.is_forum_admin()) with check (author_id = auth.uid() or public.is_forum_admin());

-- One-time author grade choice: after insert, only an administrator can change the grade.
create or replace function public.protect_post_secret_grade()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.secret_grade is distinct from old.secret_grade then
    if not public.is_forum_admin() then
      raise exception '게시물 비밀등급은 작성 후 변경할 수 없습니다.';
    end if;
    new.grade_set_by := auth.uid();
    new.grade_locked := true;
    insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
    values(auth.uid(),'POST_SECRET_GRADE_CHANGED','post',new.id::text,jsonb_build_object('from',old.secret_grade,'to',new.secret_grade));
  end if;
  return new;
end $$;
drop trigger if exists protect_post_secret_grade_trigger on public.posts;
create trigger protect_post_secret_grade_trigger before update on public.posts for each row execute function public.protect_post_secret_grade();

-- Narrow admin RPC for assigning a member's clearance; direct client updates are blocked by RLS.
create or replace function public.admin_set_security_clearance(target_user uuid, new_clearance smallint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_forum_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  if new_clearance not between 1 and 3 then raise exception '인가 등급이 올바르지 않습니다.'; end if;
  update public.profiles set security_clearance = new_clearance, updated_at = now() where id = target_user;
  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'USER_CLEARANCE_CHANGED','user',target_user::text,jsonb_build_object('clearance',new_clearance));
end $$;
revoke all on function public.admin_set_security_clearance(uuid,smallint) from public;
grant execute on function public.admin_set_security_clearance(uuid,smallint) to authenticated;

-- CS reader list management is admin-only through RPC.
create or replace function public.admin_set_cs_reader(target_user uuid, allowed boolean)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_forum_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  if allowed then
    insert into public.cs_readers(user_id,granted_by) values(target_user,auth.uid()) on conflict(user_id) do nothing;
  else
    delete from public.cs_readers where user_id = target_user;
  end if;
  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'CS_READER_CHANGED','user',target_user::text,jsonb_build_object('allowed',allowed));
end $$;
revoke all on function public.admin_set_cs_reader(uuid,boolean) from public;
grant execute on function public.admin_set_cs_reader(uuid,boolean) to authenticated;

-- Likes, views, subscriptions and notifications are scoped to their owner.
drop policy if exists likes_read_all on public.post_likes;
create policy likes_read_all on public.post_likes for select using (true);
drop policy if exists likes_insert_self on public.post_likes;
create policy likes_insert_self on public.post_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists likes_delete_self on public.post_likes;
create policy likes_delete_self on public.post_likes for delete to authenticated using (user_id = auth.uid() or public.is_forum_admin());
drop policy if exists views_owner_read on public.post_views;
create policy views_owner_read on public.post_views for select to authenticated using (user_id = auth.uid() or public.is_forum_admin());
drop policy if exists views_insert_auth on public.post_views;
create policy views_insert_auth on public.post_views for insert to authenticated with check (user_id = auth.uid() or user_id is null);
drop policy if exists subscriptions_owner_all on public.forum_subscriptions;
create policy subscriptions_owner_all on public.forum_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notifications_owner_all on public.notifications;
create policy notifications_owner_all on public.notifications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists audit_admin_read on public.admin_audit_logs;
create policy audit_admin_read on public.admin_audit_logs for select to authenticated using (public.is_forum_admin());

-- Storage bucket for user-uploaded post images. Public read, authenticated upload to own folder.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('forum-uploads','forum-uploads',true,10485760,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do nothing;
drop policy if exists forum_uploads_public_read on storage.objects;
create policy forum_uploads_public_read on storage.objects for select using (bucket_id = 'forum-uploads');
drop policy if exists forum_uploads_owner_insert on storage.objects;
create policy forum_uploads_owner_insert on storage.objects for insert to authenticated with check (bucket_id = 'forum-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists forum_uploads_owner_delete on storage.objects;
create policy forum_uploads_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'forum-uploads' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_forum_admin()));

-- Bootstrap the first administrator only after creating their Supabase Auth account:
-- insert into public.admin_roles(user_id) values ('AUTH_USER_UUID');
-- Account deletion requires a server-side Edge Function using service_role; never expose it to the browser.


-- Minimal starter forums; safe to run once (slug is unique).
insert into public.forums(name,slug,description,category,icon,is_public) values
('공지 및 보안 수칙','notices','운영 정책과 중요 공지사항','공지 포럼','Megaphone',true),
('자유 게시판','general','자유롭게 의견을 나누는 공간','자유 포럼','Coffee',true),
('IT & 개발 연구실','tech-dev','개발 및 기술 정보를 공유하는 공간','정보 포럼','Terminal',true)
on conflict(slug) do nothing;


drop policy if exists security_config_read_all on public.site_security_config;
create policy security_config_read_all on public.site_security_config for select using (true);
create or replace function public.admin_set_site_security_level(new_level smallint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_forum_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  if new_level not between 1 and 5 then raise exception '보안 단계가 올바르지 않습니다.'; end if;
  update public.site_security_config set level = new_level, updated_by = auth.uid(), updated_at = now() where singleton = true;
  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'SITE_SECURITY_LEVEL_CHANGED','site','global',jsonb_build_object('level',new_level));
end $$;
revoke all on function public.admin_set_site_security_level(smallint) from public;
grant execute on function public.admin_set_site_security_level(smallint) to authenticated;

create or replace function public.admin_set_user_role(target_user uuid, make_admin boolean)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_forum_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  if target_user = auth.uid() and not make_admin then raise exception '자기 자신의 관리자 권한은 이 화면에서 회수할 수 없습니다.'; end if;
  if make_admin then
    insert into public.admin_roles(user_id,granted_by) values(target_user,auth.uid()) on conflict(user_id) do nothing;
  else
    delete from public.admin_roles where user_id = target_user;
  end if;
  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'USER_ADMIN_ROLE_CHANGED','user',target_user::text,jsonb_build_object('is_admin',make_admin));
end $$;
revoke all on function public.admin_set_user_role(uuid,boolean) from public;
grant execute on function public.admin_set_user_role(uuid,boolean) to authenticated;

-- Enable realtime change events for the frontend's live refresh channel.
do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','forums','posts','comments','post_likes','forum_subscriptions','site_security_config','admin_roles','cs_readers'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
