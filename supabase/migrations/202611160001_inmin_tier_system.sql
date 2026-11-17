-- 인민정보국: 관리자가 직접 추가/수정/삭제할 수 있는 서열(등급) 체계.
-- 기존 '로키 데이터베이스' 브랜드의 고정 등급명을 신입생 -> 공작원 -> 동지 -> 최고위원 체계로 교체합니다.
-- Run once in Supabase SQL Editor after the foundation migration.

create table if not exists public.custom_tiers (
  id text primary key,
  label text not null unique,
  level integer not null,
  description text not null default '',
  badge_bg text not null default 'bg-slate-800/80',
  badge_border text not null default 'border-slate-600',
  text_color text not null default 'text-slate-300',
  glow_color text not null default 'rgba(148,163,184,0.2)',
  icon_name text not null default 'Sparkles',
  auto_requirement jsonb, -- { "posts"?: number, "comments"?: number, "visits"?: number }
  is_admin_only boolean not null default false,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists tier_manually_set boolean not null default false;

insert into public.custom_tiers (id, label, level, description, badge_bg, badge_border, text_color, glow_color, icon_name, auto_requirement, is_admin_only, is_default)
values
  ('tier-recruit', '신입생', 1, '인민정보국에 처음 등록된 요원에게 자동 지급되는 초기 서열', 'bg-slate-800/80', 'border-slate-600', 'text-slate-300', 'rgba(148,163,184,0.2)', 'Sparkles', null, false, true),
  ('tier-operative', '공작원', 2, '게시물 10개 또는 댓글 20개 이상 작성하여 임무 수행 능력을 증명한 요원', 'bg-red-950/70', 'border-red-700/70', 'text-red-400', 'rgba(239,68,68,0.25)', 'Compass', '{"posts":10}'::jsonb, false, false),
  ('tier-comrade', '동지', 3, '게시물 30개 이상 및 댓글 50개 이상, 조직에 대한 확고한 충성을 증명한 요원', 'bg-amber-950/80', 'border-amber-500', 'text-amber-400', 'rgba(245,158,11,0.4)', 'Star', '{"posts":30,"comments":50}'::jsonb, false, false),
  ('tier-supreme', '최고위원', 99, '정치국이 직접 임명한 최고 서열. 관리자 계정에 자동 부여되며, 일반 요원에게는 관리자가 직접 지급해야만 합니다.', 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700', 'border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)]', 'text-black font-extrabold', 'rgba(245,158,11,0.8)', 'ShieldAlert', null, true, false)
on conflict (id) do nothing;

-- 기존 브랜드 등급명을 새 체계로 일괄 치환 (이미 가입된 회원이 있을 경우)
update public.profiles set activity_tier = '신입생' where activity_tier = '신입';
update public.profiles set activity_tier = '공작원' where activity_tier = '실버';
update public.profiles set activity_tier = '동지' where activity_tier = '골드';
update public.profiles set activity_tier = '최고위원' where activity_tier = '창립자';

alter table public.profiles alter column activity_tier set default '신입생';

create or replace function public.handle_loki_auth_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id,nickname,status,activity_tier)
  values(new.id, coalesce(new.raw_user_meta_data->>'nickname','익명회원'), 'pending', '신입생');
  return new;
end $$;

alter table public.custom_tiers enable row level security;

drop policy if exists custom_tiers_public_read on public.custom_tiers;
create policy custom_tiers_public_read on public.custom_tiers for select using (true);

-- 직접적인 insert/update/delete는 RLS로 차단하고, 아래 관리자 전용 RPC로만 변경합니다.
drop policy if exists custom_tiers_no_direct_write on public.custom_tiers;
create policy custom_tiers_no_direct_write on public.custom_tiers for all to authenticated using (false) with check (false);

create or replace function public.admin_upsert_tier(
  p_id text, p_label text, p_level integer, p_description text,
  p_badge_bg text, p_badge_border text, p_text_color text, p_glow_color text, p_icon_name text,
  p_auto_requirement jsonb, p_is_admin_only boolean, p_is_default boolean
) returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_forum_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  insert into public.custom_tiers (id, label, level, description, badge_bg, badge_border, text_color, glow_color, icon_name, auto_requirement, is_admin_only, is_default, updated_at)
  values (p_id, p_label, p_level, p_description, p_badge_bg, p_badge_border, p_text_color, p_glow_color, p_icon_name, p_auto_requirement, p_is_admin_only, p_is_default, now())
  on conflict (id) do update set
    label = excluded.label, level = excluded.level, description = excluded.description,
    badge_bg = excluded.badge_bg, badge_border = excluded.badge_border, text_color = excluded.text_color,
    glow_color = excluded.glow_color, icon_name = excluded.icon_name, auto_requirement = excluded.auto_requirement,
    is_admin_only = excluded.is_admin_only, is_default = excluded.is_default, updated_at = now();
  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'TIER_UPSERTED','tier',p_id,jsonb_build_object('label',p_label,'level',p_level));
end $$;
revoke all on function public.admin_upsert_tier(text,text,integer,text,text,text,text,text,text,jsonb,boolean,boolean) from public;
grant execute on function public.admin_upsert_tier(text,text,integer,text,text,text,text,text,text,jsonb,boolean,boolean) to authenticated;

create or replace function public.admin_delete_tier(p_id text, p_fallback_label text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_forum_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  -- 삭제되는 등급을 보유한 회원은 대체 등급으로 강등하고 수동 지정 플래그를 해제합니다 (자동 재산정 재개).
  update public.profiles set activity_tier = p_fallback_label, tier_manually_set = false
  where activity_tier = (select label from public.custom_tiers where id = p_id);
  delete from public.custom_tiers where id = p_id;
  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'TIER_DELETED','tier',p_id,jsonb_build_object('fallback',p_fallback_label));
end $$;
revoke all on function public.admin_delete_tier(text,text) from public;
grant execute on function public.admin_delete_tier(text,text) to authenticated;

-- 관리자가 특정 요원에게 서열을 직접 임명(지급)합니다. 이후 활동량 기반 자동 재산정은 멈춥니다.
create or replace function public.admin_grant_tier(target_user uuid, tier_label text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_forum_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  if not exists (select 1 from public.custom_tiers where label = tier_label) then
    raise exception '존재하지 않는 서열입니다: %', tier_label;
  end if;
  update public.profiles set activity_tier = tier_label, tier_manually_set = true, updated_at = now() where id = target_user;
  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'TIER_GRANTED','user',target_user::text,jsonb_build_object('tier',tier_label));
end $$;
revoke all on function public.admin_grant_tier(uuid,text) from public;
grant execute on function public.admin_grant_tier(uuid,text) to authenticated;

-- 수동 지정을 해제하여 활동량 기반 자동 서열 산정을 재개합니다.
create or replace function public.admin_reset_tier(target_user uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_forum_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  update public.profiles set tier_manually_set = false, updated_at = now() where id = target_user;
  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'TIER_RESET','user',target_user::text,'{}'::jsonb);
end $$;
revoke all on function public.admin_reset_tier(uuid) from public;
grant execute on function public.admin_reset_tier(uuid) to authenticated;
