-- Vòng đời tài khoản: người dùng tự xuất dữ liệu và tự xóa tài khoản.
--
-- Cung cấp:
--   public.export_my_data()            -> jsonb: dữ liệu CỦA CHÍNH người gọi (hồ sơ, tiến trình,
--                                         từng lựa chọn, lịch sử lượt chơi, chứng nhận).
--   public.delete_my_account(text)     -> jsonb: xóa tài khoản + toàn bộ dữ liệu liên quan.
--
-- Cả hai là wrapper SECURITY INVOKER ủy quyền sang hàm SECURITY DEFINER trong schema
-- private (cùng mẫu với các RPC quản trị ở 20261002101000). Giới hạn tốc độ nằm ở hook
-- private.data_api_pre_request (xem 20261002132000).
--
-- Quy tắc xóa tài khoản (private.delete_my_account):
--   1. Cần phiên đang sống (auth.sessions khớp session_id của JWT).
--   2. Cần XÁC THỰC GẦN ĐÂY (private.assert_recent_authentication, mặc định 10 phút): mốc
--      mới nhất giữa lúc tạo phiên hiện tại và các mốc "amr" trong JWT. Giao diện đăng nhập
--      lại bằng mật khẩu ngay trước khi gọi nên luôn đáp ứng; token cũ bị đánh cắp thì không.
--      Vi phạm: SQLSTATE CG006.
--   3. Cần cụm xác nhận gõ tay đúng bằng tên đăng nhập của tài khoản (không phân biệt hoa
--      thường). Sai: SQLSTATE 22023.
--   4. KHÔNG xóa được nếu tài khoản còn quyền Quản trị/Biên tập viên (phải được quản trị
--      viên khác hạ quyền trước). Với quản trị viên cuối cùng thì thông báo nêu rõ. Vi phạm:
--      SQLSTATE CG005. Việc kiểm tra khóa bảng quyền ở chế độ SHARE ROW EXCLUSIVE để một lệnh
--      cấp quyền chạy song song không thể tạo ra "quản trị viên cuối cùng" bị xóa mất.
--   5. Xóa dòng auth.users; các bảng liên quan xóa theo khóa ngoại ON DELETE CASCADE
--      (profiles, user_progress, test_attempts, private.game_history,
--      private.training_certificates, app_admins, app_editors) kèm dữ liệu giới hạn tốc độ
--      gắn với tài khoản. Chứng nhận đã cấp không còn xác minh được sau khi xóa.
--   6. Ghi một dòng audit TỐI GIẢN (private.log_privacy_event): không IP, không user-agent,
--      không email/tên; mã tài khoản chỉ xuất hiện dạng băm có muối. Lưu số lượng bản ghi bị
--      xóa. (private.log_security_event ghi cả IP và user-agent nên không dùng cho sự kiện này.)
--
-- Việc xuất/xóa không đụng tới nhật ký kiểm toán đã có của tài khoản đặc quyền cũ
-- (private.security_audit_log chỉ giữ mã tài khoản; không có chính sách xóa tự động).
--
-- Khóa ngoại site_content.updated_by: trước đây NOT NULL và không có ON DELETE, nên một
-- Biên tập viên cũ (đã hạ quyền) vẫn không xóa được tài khoản. Chuyển sang ON DELETE SET NULL
-- (nội dung tồn tại lâu hơn người soạn). Không thay đổi gì khác trên bảng.
-- Idempotent: chạy lại an toàn.

-- 0. site_content không được chặn việc xóa tài khoản --------------------------------------
do $$
declare
  fk_def text;
begin
  if to_regclass('public.site_content') is null then
    return;
  end if;

  alter table public.site_content alter column updated_by drop not null;

  select pg_get_constraintdef(c.oid) into fk_def
  from pg_constraint c
  where c.conrelid = 'public.site_content'::regclass
    and c.conname = 'site_content_updated_by_fkey';

  if fk_def is null or fk_def not ilike '%on delete set null%' then
    alter table public.site_content drop constraint if exists site_content_updated_by_fkey;
    alter table public.site_content
      add constraint site_content_updated_by_fkey
      foreign key (updated_by) references auth.users(id) on delete set null;
  end if;
end
$$;

-- 1. Phiên sống + xác thực gần đây -----------------------------------------------------------
create or replace function private.assert_recent_authentication(max_age interval default interval '10 minutes')
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  claims jsonb := coalesce((select auth.jwt()), '{}'::jsonb);
  session_started timestamptz;
  last_amr timestamptz;
  last_authenticated timestamptz;
begin
  if uid is null then
    raise exception 'Active sign-in required' using errcode = '42501';
  end if;

  select s.created_at into session_started
  from auth.sessions s
  where s.user_id = uid and s.id::text = (claims ->> 'session_id');
  if not found then
    raise exception 'Active sign-in required' using errcode = '42501';
  end if;

  -- "amr": [{ "method": "password", "timestamp": 1760000000 }, ...] do Supabase Auth cấp.
  select max(to_timestamp((entry ->> 'timestamp')::double precision)) into last_amr
  from jsonb_array_elements(
         case when jsonb_typeof(claims -> 'amr') = 'array' then claims -> 'amr' else '[]'::jsonb end
       ) entry
  where jsonb_typeof(entry) = 'object'
    and (entry ->> 'timestamp') ~ '^[0-9]{1,12}(\.[0-9]+)?$';

  last_authenticated := greatest(session_started, last_amr);
  if last_authenticated is null or last_authenticated < clock_timestamp() - max_age then
    raise exception 'Recent authentication required' using
      errcode = 'CG006',
      hint = 'Sign in again with your password, then retry within a few minutes.';
  end if;
end;
$$;
revoke all on function private.assert_recent_authentication(interval) from public, anon, authenticated;

-- 2. Nhật ký sự kiện riêng tư (không IP / user-agent / danh tính) ------------------------------
create or replace function private.log_privacy_event(
  event_action text,
  event_target_type text default null,
  event_target_id text default null,
  event_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.security_audit_log(
    action, target_type, target_id, outcome, metadata
  ) values (
    left(event_action, 80), event_target_type, event_target_id, 'success',
    coalesce(event_metadata, '{}'::jsonb)
  );
end;
$$;
revoke all on function private.log_privacy_event(text, text, text, jsonb) from public, anon, authenticated;

-- Mã tài khoản băm có muối (muối của giới hạn tốc độ; nếu thiếu vẫn băm với muối rỗng).
create or replace function private.pseudonymize_id(subject uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select 'sha256:' || left(
    encode(
      pg_catalog.sha256(convert_to(
        coalesce((select value from private.security_settings where key = 'ip_hash_secret'), '')
        || ':account:' || subject::text,
        'UTF8')),
      'hex'),
    24)
$$;
revoke all on function private.pseudonymize_id(uuid) from public, anon, authenticated;

-- 3. Xuất dữ liệu của chính mình -------------------------------------------------------------
create or replace function private.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  claims jsonb := coalesce((select auth.jwt()), '{}'::jsonb);
  account_row jsonb;
  profile_row jsonb;
  progress_row jsonb;
  attempts jsonb;
  history jsonb;
  certificates jsonb;
  role_name text;
  payload jsonb;
begin
  if uid is null or not exists (
    select 1 from auth.sessions s
    where s.user_id = uid and s.id::text = (claims ->> 'session_id')
  ) then
    raise exception 'Active sign-in required' using errcode = '42501';
  end if;

  select jsonb_build_object(
           'id', u.id,
           'email', u.email,
           'emailConfirmedAt', u.email_confirmed_at,
           'createdAt', u.created_at)
    into account_row
  from auth.users u where u.id = uid;

  select jsonb_build_object(
           'username', p.username,
           'displayName', p.display_name,
           'createdAt', p.created_at)
    into profile_row
  from public.profiles p where p.id = uid;

  select jsonb_build_object(
           'balance', g.balance,
           'awareness', g.awareness,
           'runId', g.run_id,
           'updatedAt', g.updated_at)
    into progress_row
  from public.user_progress g where g.user_id = uid;

  select coalesce(jsonb_agg(jsonb_build_object(
           'scenarioId', a.scenario_id,
           'choiceIndex', a.choice_index,
           'correct', a.correct,
           'balanceAfter', a.balance_after,
           'awarenessAfter', a.awareness_after,
           'serverVerified', a.server_verified,
           'attemptedAt', a.attempted_at
         ) order by a.attempted_at, a.scenario_id), '[]'::jsonb)
    into attempts
  from public.test_attempts a where a.user_id = uid;

  select coalesce(jsonb_agg(jsonb_build_object(
           'runId', h.run_id,
           'finishedAt', h.finished_at,
           'balance', h.balance,
           'awareness', h.awareness,
           'attempts', h.attempts
         ) order by h.finished_at), '[]'::jsonb)
    into history
  from private.game_history h where h.user_id = uid;

  select coalesce(jsonb_agg(jsonb_build_object(
           'certificateCode', c.certificate_code,
           'issuedAt', c.issued_at,
           'runId', c.run_id,
           'displayName', c.display_name,
           'username', c.username,
           'scenarioTotal', c.scenario_total,
           'completed', c.completed,
           'correct', c.correct,
           'accuracy', c.accuracy,
           'score', c.score,
           'rating', c.rating
         ) order by c.issued_at), '[]'::jsonb)
    into certificates
  from private.training_certificates c where c.user_id = uid;

  role_name := case
    when exists (select 1 from private.app_admins a where a.user_id = uid) then 'admin'
    when exists (select 1 from private.app_editors e where e.user_id = uid) then 'editor'
    else 'member'
  end;

  payload := jsonb_build_object(
    'schemaVersion', 1,
    'source', 'canhgiacso.com',
    'exportedAt', clock_timestamp(),
    'account', coalesce(account_row, '{}'::jsonb),
    'profile', coalesce(profile_row, '{}'::jsonb),
    'role', role_name,
    'progress', coalesce(progress_row, '{}'::jsonb),
    'attempts', attempts,
    'history', history,
    'certificates', certificates,
    'notRecorded', jsonb_build_array(
      'Mật khẩu và mã xác thực (do dịch vụ xác thực quản lý, không đọc được)',
      'Mã băm địa chỉ IP dùng để giới hạn tốc độ (xóa sau tối đa 24 giờ)',
      'Thống kê truy cập ẩn danh (không gắn với tài khoản)',
      'Nhật ký bảo mật nội bộ của tài khoản đặc quyền'
    )
  );

  perform private.log_privacy_event(
    'ACCOUNT_DATA_EXPORTED', 'account', private.pseudonymize_id(uid),
    jsonb_build_object(
      'attempts', jsonb_array_length(attempts),
      'runs', jsonb_array_length(history),
      'certificates', jsonb_array_length(certificates)
    )
  );
  return payload;
end;
$$;
revoke all on function private.export_my_data() from public, anon;
grant execute on function private.export_my_data() to authenticated;

create or replace function public.export_my_data()
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.export_my_data() $$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- 4. Xóa tài khoản --------------------------------------------------------------------------
create or replace function private.delete_my_account(confirmation text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  expected_phrase text;
  typed_phrase text := lower(btrim(coalesce(confirmation, '')));
  admin_count integer;
  attempts_count integer;
  runs_count integer;
  certificates_count integer;
  pseudonym text;
begin
  perform private.assert_recent_authentication();

  -- Khóa bảng quyền trước khi kiểm tra để lệnh cấp quyền song song phải chờ.
  lock table private.app_admins, private.app_editors in share row exclusive mode;

  select p.username into expected_phrase from public.profiles p where p.id = uid;
  expected_phrase := coalesce(expected_phrase, 'xoa tai khoan');
  if typed_phrase <> lower(expected_phrase) then
    raise exception 'Confirmation text does not match' using
      errcode = '22023',
      hint = 'Type your username exactly to confirm.';
  end if;

  if exists (select 1 from private.app_admins a where a.user_id = uid) then
    select count(*) into admin_count from private.app_admins;
    raise exception 'Privileged account cannot be deleted' using
      errcode = 'CG005',
      detail = case when admin_count <= 1 then 'last_admin' else 'administrator' end,
      hint = case when admin_count <= 1
                  then 'This is the last administrator. Grant another administrator first, then ask them to demote this account.'
                  else 'Ask another administrator to demote this account to member first.' end;
  end if;
  if exists (select 1 from private.app_editors e where e.user_id = uid) then
    raise exception 'Privileged account cannot be deleted' using
      errcode = 'CG005',
      detail = 'editor',
      hint = 'Ask an administrator to demote this account to member first.';
  end if;

  select count(*) into attempts_count from public.test_attempts where user_id = uid;
  select count(*) into runs_count from private.game_history where user_id = uid;
  select count(*) into certificates_count from private.training_certificates where user_id = uid;
  pseudonym := private.pseudonymize_id(uid);

  delete from private.api_rate_limits where actor_user_id = uid;
  delete from auth.users where id = uid;
  if not found then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;

  perform private.log_privacy_event(
    'ACCOUNT_DELETED', 'account', pseudonym,
    jsonb_build_object(
      'attempts', attempts_count,
      'runs', runs_count,
      'certificates', certificates_count
    )
  );
  return jsonb_build_object('deleted', true);
end;
$$;
revoke all on function private.delete_my_account(text) from public, anon;
grant execute on function private.delete_my_account(text) to authenticated;

create or replace function public.delete_my_account(confirmation text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.delete_my_account(confirmation) $$;

revoke all on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;

notify pgrst, 'reload schema';
