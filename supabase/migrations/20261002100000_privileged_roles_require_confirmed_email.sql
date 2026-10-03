-- Đặc quyền (Quản trị / Biên tập viên) chỉ dành cho tài khoản có email ĐÃ XÁC NHẬN.
--
-- Vấn đề: set_content_manager_role cấp quyền theo email mà không kiểm tra
-- auth.users.email_confirmed_at. Nếu dự án cho đăng ký không cần xác nhận email,
-- kẻ gian có thể đăng ký trước bằng email nhân sự (không cần sở hữu hộp thư); khi
-- Quản trị viên cấp quyền theo email, kẻ đó thừa hưởng quyền và tự đăng ký TOTP.
--
-- Nội dung migration:
--   0. Chốt an toàn: dừng (không thay đổi gì) nếu có tài khoản đặc quyền hiện hữu
--      chưa xác nhận email, để KHÔNG khóa nhầm admin/editor.
--   1. private.privileged_email_domains: danh sách miền email được phép nhận quyền
--      (rỗng = không giới hạn). Chỉ áp dụng khi CẤP/NÂNG quyền, không ảnh hưởng
--      tài khoản đã có quyền.
--   2. user_is_app_admin()/user_can_edit_content()/get_content_management_role()
--      yêu cầu thêm email_confirmed_at is not null của chính người gọi.
--   3. private.set_content_manager_role: từ chối cấp admin/editor cho email chưa xác
--      nhận (SQLSTATE CG001) hoặc miền không thuộc danh sách (CG002); ghi nhật ký
--      kiểm toán mọi lần đổi quyền.
--   4. public.set_content_manager_role ủy quyền sang bản private (một nguồn sự thật).
--   5. get_content_management_access trả thêm email_confirmed cho từng tài khoản.
--   6. RPC quản lý danh sách miền (chỉ Quản trị + AAL2).
--
-- LƯU Ý: kiểm tra email_confirmed_at chỉ có tác dụng chống đăng ký-trước SAU KHI
-- chủ dự án bật "Confirm email" trong Supabase Auth (khi tắt, Supabase tự điền
-- email_confirmed_at lúc đăng ký). Xem documentation/security/.
--
-- Lỗi bị từ chối được ghi bằng `raise log` (nhật ký Postgres) vì một dòng audit chèn
-- trong cùng giao dịch sẽ bị rollback cùng với lỗi.
-- Idempotent: chạy lại an toàn.

-- 0. Chốt an toàn --------------------------------------------------------------
do $$
declare
  blocked integer;
begin
  select count(*) into blocked
  from auth.users u
  where u.email_confirmed_at is null
    and (
      exists (select 1 from private.app_admins a where a.user_id = u.id)
      or exists (select 1 from private.app_editors e where e.user_id = u.id)
    );
  if blocked > 0 then
    raise exception 'Migration stopped: % privileged account(s) have an unconfirmed email and would lose access.', blocked
      using errcode = 'CG003',
            hint = 'List them with supabase/verification/production-checks.sql (section 7). For each: confirm the owner''s identity and set auth.users.email_confirmed_at, or demote the account. Then re-run this migration.';
  end if;
end
$$;

-- 1. Danh sách miền email được phép nhận quyền ---------------------------------
create table if not exists private.privileged_email_domains (
  domain text primary key,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint privileged_email_domains_format check (
    domain = lower(domain)
    and char_length(domain) between 3 and 253
    and domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
  )
);

alter table private.privileged_email_domains enable row level security;
revoke all on table private.privileged_email_domains from public, anon, authenticated;

drop policy if exists privileged_email_domains_no_direct_access on private.privileged_email_domains;
create policy privileged_email_domains_no_direct_access
on private.privileged_email_domains
for all
to anon, authenticated
using (false)
with check (false);

-- Rỗng = không giới hạn. Khi có dòng: chỉ email thuộc đúng các miền đó được cấp quyền.
create or replace function private.email_domain_allowed_for_privilege(target_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from private.privileged_email_domains)
    or exists (
      select 1
      from private.privileged_email_domains d
      where d.domain = lower(substring(coalesce(target_email, '') from '@([^@]+)$'))
    );
$$;
revoke all on function private.email_domain_allowed_for_privilege(text) from public, anon, authenticated;

-- 2. Các hàm kiểm quyền yêu cầu email đã xác nhận ------------------------------
-- Giữ nguyên các điều kiện cũ: phiên còn sống, AAL2, thuộc nhóm quyền.
create or replace function private.user_is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
    and exists (
      select 1 from auth.sessions session_row
      where session_row.user_id = (select auth.uid())
        and session_row.id::text = (select auth.jwt()->>'session_id')
    )
    and exists (
      select 1 from auth.users user_row
      where user_row.id = (select auth.uid())
        and user_row.email_confirmed_at is not null
    )
    and exists (
      select 1 from private.app_admins where user_id = (select auth.uid())
    );
$$;

create or replace function private.user_can_edit_content()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
    and exists (
      select 1 from auth.sessions session_row
      where session_row.user_id = (select auth.uid())
        and session_row.id::text = (select auth.jwt()->>'session_id')
    )
    and exists (
      select 1 from auth.users user_row
      where user_row.id = (select auth.uid())
        and user_row.email_confirmed_at is not null
    )
    and (
      exists (select 1 from private.app_admins where user_id = (select auth.uid()))
      or exists (select 1 from private.app_editors where user_id = (select auth.uid()))
    );
$$;

-- Khám phá vai trò ở AAL1 (cổng MFA của giao diện): tài khoản chưa xác nhận email
-- không được coi là đặc quyền, nên không bị ép đăng ký TOTP.
create or replace function private.get_content_management_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then null
    when not exists (
      select 1 from auth.sessions s
      where s.user_id = (select auth.uid())
        and s.id::text = (select auth.jwt()->>'session_id')
    ) then null
    when not exists (
      select 1 from auth.users u
      where u.id = (select auth.uid())
        and u.email_confirmed_at is not null
    ) then null
    when exists (select 1 from private.app_admins a where a.user_id = (select auth.uid())) then 'admin'
    when exists (select 1 from private.app_editors e where e.user_id = (select auth.uid())) then 'editor'
    else null
  end;
$$;

-- 3. Cấp/thu hồi quyền ---------------------------------------------------------
create or replace function private.set_content_manager_role(target_user_id uuid, target_role text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_role text := lower(trim(coalesce(target_role, '')));
  caller_id uuid := auth.uid();
  target_email text;
  target_confirmed_at timestamptz;
  previous_role text;
  previous_rank integer;
  new_rank integer;
begin
  if not (select private.user_is_app_admin()) then
    raise log 'security_event action=ROLE_CHANGE_DENIED reason=not_admin actor=% target=% aal=%',
      caller_id, target_user_id, coalesce(auth.jwt()->>'aal', 'aal1');
    raise exception 'Administrator access and MFA required' using errcode = '42501';
  end if;
  if normalized_role not in ('admin', 'editor', 'member') then
    raise exception 'Invalid content role' using errcode = '22023';
  end if;
  if target_user_id = caller_id and normalized_role <> 'admin' then
    raise exception 'Administrators cannot change their own role' using errcode = '42501';
  end if;

  select u.email, u.email_confirmed_at
  into target_email, target_confirmed_at
  from auth.users u
  where u.id = target_user_id;
  if target_email is null then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  previous_role := case
    when exists (select 1 from private.app_admins where user_id = target_user_id) then 'admin'
    when exists (select 1 from private.app_editors where user_id = target_user_id) then 'editor'
    else 'member'
  end;
  previous_rank := case previous_role when 'admin' then 2 when 'editor' then 1 else 0 end;
  new_rank := case normalized_role when 'admin' then 2 when 'editor' then 1 else 0 end;

  -- Chỉ kiểm tra khi CẤP hoặc NÂNG quyền. Hạ quyền/thu hồi không bao giờ bị chặn.
  if new_rank > previous_rank then
    if target_confirmed_at is null then
      raise log 'security_event action=ROLE_GRANT_DENIED reason=email_not_confirmed actor=% target=% requested_role=%',
        caller_id, target_user_id, normalized_role;
      raise exception 'Target email address must be confirmed before granting a privileged role'
        using errcode = 'CG001',
              hint = 'Ask the user to confirm their email address, then grant the role again.';
    end if;
    if not private.email_domain_allowed_for_privilege(target_email) then
      raise log 'security_event action=ROLE_GRANT_DENIED reason=email_domain_not_allowed actor=% target=% requested_role=%',
        caller_id, target_user_id, normalized_role;
      raise exception 'Target email domain is not on the privileged-role allow-list'
        using errcode = 'CG002',
              hint = 'An administrator can review the allow-list with get_privileged_email_domains().';
    end if;
  end if;

  delete from private.app_editors where user_id = target_user_id;
  delete from private.app_admins where user_id = target_user_id;
  if normalized_role = 'admin' then
    insert into private.app_admins (user_id) values (target_user_id);
  elsif normalized_role = 'editor' then
    insert into private.app_editors (user_id) values (target_user_id);
  end if;

  perform private.log_security_event(
    'ROLE_CHANGED', 'user', target_user_id::text, 'success',
    jsonb_build_object(
      'previous_role', previous_role,
      'new_role', normalized_role,
      'change', case
        when new_rank > previous_rank then 'grant'
        when new_rank < previous_rank then 'revoke'
        else 'unchanged'
      end,
      'target_email_confirmed', target_confirmed_at is not null
    )
  );

  return jsonb_build_object('userId', target_user_id, 'email', target_email, 'role', normalized_role);
end;
$$;

revoke all on function private.set_content_manager_role(uuid, text) from public, anon;
grant execute on function private.set_content_manager_role(uuid, text) to authenticated;

-- 4. Hàm công khai ủy quyền sang bản private (giữ nguyên chữ ký và kết quả) ------
create or replace function public.set_content_manager_role(target_user_id uuid, target_role text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.set_content_manager_role(target_user_id, target_role)
$$;

revoke all on function public.set_content_manager_role(uuid, text) from public, anon;
grant execute on function public.set_content_manager_role(uuid, text) to authenticated;

-- 5. Danh sách quản trị: thêm email_confirmed cho từng tài khoản ------------------
create or replace function public.get_content_management_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  management_role text;
  managed_users jsonb := '[]'::jsonb;
  allowed_domains jsonb := '[]'::jsonb;
begin
  if (select private.user_is_app_admin()) then
    management_role := 'admin';
  elsif (select private.user_can_edit_content()) then
    management_role := 'editor';
  else
    raise exception 'Content management access required' using errcode = '42501';
  end if;

  if management_role = 'admin' then
    select coalesce(jsonb_agg(to_jsonb(user_rows) order by user_rows.role_rank, user_rows.display_name), '[]'::jsonb)
    into managed_users
    from (
      select
        user_row.id,
        user_row.email,
        profile_row.username,
        profile_row.display_name,
        user_row.created_at,
        (user_row.email_confirmed_at is not null) as email_confirmed,
        case
          when admin_row.user_id is not null then 'admin'
          when editor_row.user_id is not null then 'editor'
          else 'member'
        end as role,
        case
          when admin_row.user_id is not null then 0
          when editor_row.user_id is not null then 1
          else 2
        end as role_rank
      from auth.users user_row
      join public.profiles profile_row on profile_row.id = user_row.id
      left join private.app_admins admin_row on admin_row.user_id = user_row.id
      left join private.app_editors editor_row on editor_row.user_id = user_row.id
    ) user_rows;

    select coalesce(jsonb_agg(d.domain order by d.domain), '[]'::jsonb)
    into allowed_domains
    from private.privileged_email_domains d;
  end if;

  -- email_confirmed ở cấp cao nhất là của chính người gọi; các hàm kiểm quyền ở
  -- trên đã đảm bảo giá trị này luôn là true khi hàm trả kết quả.
  return jsonb_build_object(
    'role', management_role,
    'email_confirmed', true,
    'users', managed_users,
    'privileged_email_domains', allowed_domains
  );
end;
$$;

revoke all on function public.get_content_management_access() from public, anon;
grant execute on function public.get_content_management_access() to authenticated;

-- 6. Quản lý danh sách miền (chỉ Quản trị + AAL2) -------------------------------
create or replace function public.get_privileged_email_domains()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.user_is_app_admin()) then
    raise exception 'Administrator access and MFA required' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(d.domain order by d.domain) from private.privileged_email_domains d
  ), '[]'::jsonb);
end;
$$;

create or replace function public.set_privileged_email_domain(target_domain text, is_allowed boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_domain text := lower(trim(both '@' from trim(coalesce(target_domain, ''))));
begin
  if not (select private.user_is_app_admin()) then
    raise log 'security_event action=PRIVILEGED_DOMAIN_CHANGE_DENIED actor=% aal=%',
      auth.uid(), coalesce(auth.jwt()->>'aal', 'aal1');
    raise exception 'Administrator access and MFA required' using errcode = '42501';
  end if;
  if is_allowed is null
     or normalized_domain !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
     or char_length(normalized_domain) > 253 then
    raise exception 'Invalid email domain' using errcode = '22023';
  end if;

  if is_allowed then
    insert into private.privileged_email_domains (domain, created_by)
    values (normalized_domain, (select auth.uid()))
    on conflict (domain) do nothing;
  else
    delete from private.privileged_email_domains where domain = normalized_domain;
  end if;

  perform private.log_security_event(
    'PRIVILEGED_EMAIL_DOMAIN_CHANGED', 'email_domain', normalized_domain, 'success',
    jsonb_build_object('allowed', is_allowed)
  );

  return coalesce((
    select jsonb_agg(d.domain order by d.domain) from private.privileged_email_domains d
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_privileged_email_domains() from public, anon;
grant execute on function public.get_privileged_email_domains() to authenticated;
revoke all on function public.set_privileged_email_domain(text, boolean) from public, anon;
grant execute on function public.set_privileged_email_domain(text, boolean) to authenticated;

notify pgrst, 'reload schema';
