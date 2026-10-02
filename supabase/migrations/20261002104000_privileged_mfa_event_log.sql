-- Nhật ký kiểm toán cho việc tài khoản đặc quyền đăng ký / xác minh lần đầu yếu tố TOTP.
--
-- Giao diện (app/security-hardening.tsx) tự đăng ký TOTP ở AAL1 cho tài khoản đặc quyền
-- chưa có yếu tố nào. Đó là bước khởi tạo bắt buộc nên cơ chế AAL của CSDL không đổi,
-- nhưng sự kiện này phải để lại dấu vết để người rà soát phát hiện việc đăng ký yếu tố
-- MFA bất thường (ví dụ: tài khoản đặc quyền cũ bất ngờ đăng ký lại TOTP).
--
-- RPC chỉ chấp nhận người gọi đang có vai trò quản trị/biên tập hợp lệ (phiên còn sống,
-- email đã xác nhận) và chỉ ghi các tên sự kiện trong danh sách cố định. Sự kiện do
-- trình duyệt báo nên chỉ là tín hiệu bổ trợ cho nhật ký của Supabase Auth.
-- Giới hạn tốc độ: rpc/log_privileged_mfa_event (xem private.data_api_pre_request).
-- Idempotent.

create or replace function public.log_privileged_mfa_event(event_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_event text := upper(btrim(coalesce(event_name, '')));
begin
  if private.get_content_management_role() is null then
    raise exception 'Content management access required' using errcode = '42501';
  end if;
  if normalized_event not in ('MFA_ENROLLMENT_STARTED', 'MFA_ENROLLMENT_VERIFIED') then
    raise exception 'Unsupported event' using errcode = '22023';
  end if;

  perform private.log_security_event(
    'PRIVILEGED_' || normalized_event,
    'user',
    (select auth.uid())::text,
    'success',
    jsonb_build_object(
      'management_role', private.get_content_management_role(),
      'reported_by', 'browser'
    )
  );
end;
$$;

revoke all on function public.log_privileged_mfa_event(text) from public, anon;
grant execute on function public.log_privileged_mfa_event(text) to authenticated;

notify pgrst, 'reload schema';
