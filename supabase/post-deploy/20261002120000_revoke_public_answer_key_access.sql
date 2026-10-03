-- ============================================================================
-- CHỈ ÁP DỤNG SAU KHI FRONTEND MỚI ĐÃ ĐƯỢC DEPLOY.
-- (Tệp này cố ý KHÔNG nằm trong supabase/migrations/ để `supabase db push` không tự
--  áp dụng nó. Áp dụng thủ công bằng SQL Editor, theo documentation/security/
--  REMEDIATION-2026-10.md, bước "post-deploy".)
-- ============================================================================
--
-- Mục tiêu: đáp án (correct / moneyDelta / awarenessDelta / feedback của MỌI lựa chọn)
-- không bao giờ rời máy chủ ở dạng bảng đọc được.
--
--   1. Chốt tiền điều kiện: RPC evaluate_guest_choice phải sẵn sàng cho anon
--      (migration 20261002102000) — nếu không, khách sẽ không chấm điểm được.
--   2. Nhắc lại (idempotent) hàm gỡ đáp án private.redact_site_content và
--      public.get_public_site_content() giống supabase/harden_gameplay_content.sql để
--      bảo đảm payload công khai KHÔNG chứa khóa đáp án, bất kể trạng thái trước đó.
--   3. Thu hồi toàn bộ quyền của anon/authenticated trên public.site_content. Trước đó
--      anon có SELECT (policy site_content_public_read) và authenticated có SELECT mọi
--      nội dung đã xuất bản -> bất kỳ ai cũng đọc được đáp án qua /rest/v1/site_content.
--      Quản trị viên vẫn đọc/ghi qua các RPC SECURITY DEFINER
--      (get_managed_site_content, save_managed_site_content).
--   4. Thu hồi hàm chấm điểm cũ submit_game_choice(uuid,int,int,jsonb) (nhận snapshot
--      từ client; đã lỗi thời) khỏi authenticated.
--
-- TẠI SAO KHÔNG ÁP DỤNG SỚM: bản frontend CŨ (đang chạy trên production tại thời điểm
-- viết) chấm khách bằng choice.correct trong payload và có thể phụ thuộc vào payload
-- chưa gỡ khóa. Thu hồi/gỡ khóa trước khi bản mới lên sẽ làm khách chấm sai.
--
-- Hoàn tác: xem phần cuối tệp.
-- Idempotent: chạy lại an toàn.

begin;

-- 1. Tiền điều kiện ------------------------------------------------------------------
do $$
begin
  if to_regprocedure('public.evaluate_guest_choice(integer,integer)') is null
     or not has_function_privilege('anon', 'public.evaluate_guest_choice(integer,integer)', 'EXECUTE') then
    raise exception 'Prerequisite missing: apply migration 20261002102000_guest_choice_rpc.sql first (anon must be able to execute public.evaluate_guest_choice).'
      using errcode = 'CG004';
  end if;
  if to_regclass('public.site_content') is null then
    raise exception 'public.site_content does not exist' using errcode = 'CG004';
  end if;
end
$$;

-- 2. Payload công khai không có khóa đáp án --------------------------------------------
create or replace function private.redact_site_content(source_content jsonb)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  select jsonb_set(
    source_content,
    '{scenarios}',
    coalesce((
      select jsonb_agg(
        (scenario_item - 'choices') || jsonb_build_object(
          'choices', coalesce((
            select jsonb_agg(choice_item - array['correct', 'moneyDelta', 'awarenessDelta', 'feedback'] order by choice_order)
            from jsonb_array_elements(scenario_item->'choices') with ordinality as choices(choice_item, choice_order)
          ), '[]'::jsonb)
        )
        order by scenario_order
      )
      from jsonb_array_elements(source_content->'scenarios') with ordinality as scenarios(scenario_item, scenario_order)
    ), '[]'::jsonb),
    true
  )
$$;
revoke all on function private.redact_site_content(jsonb) from public, anon, authenticated;

create or replace function public.get_public_site_content()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare payload jsonb;
begin
  select private.redact_site_content(content)
  into payload
  from public.site_content
  where slug = 'main' and published
  limit 1;
  return payload;
end
$$;
revoke all on function public.get_public_site_content() from public;
grant execute on function public.get_public_site_content() to anon, authenticated;

-- 3. Không còn đường đọc/ghi bảng trực tiếp ---------------------------------------------
revoke all on table public.site_content from anon, authenticated;

-- 4. Hàm chấm điểm cũ (nhận scenario_snapshot từ client) -----------------------------------
do $$
begin
  if to_regprocedure('public.submit_game_choice(uuid,integer,integer,jsonb)') is not null then
    revoke execute on function public.submit_game_choice(uuid, integer, integer, jsonb) from public, anon, authenticated;
  end if;
  if to_regprocedure('private.submit_game_choice(uuid,integer,integer,jsonb)') is not null then
    revoke execute on function private.submit_game_choice(uuid, integer, integer, jsonb) from public, anon, authenticated;
  end if;
end
$$;

notify pgrst, 'reload schema';
commit;

-- ============================================================================
-- HOÀN TÁC (chỉ khi gặp sự cố ngay sau khi áp dụng; sẽ MỞ LẠI việc lộ đáp án):
--   grant select on table public.site_content to anon, authenticated;
--   -- (không cấp lại insert/update/delete: chúng đã bị thu hồi bởi migration
--   --  20261002101000 và không có đường mã nào cần tới)
--   grant execute on function public.submit_game_choice(uuid, integer, integer, jsonb) to authenticated;
--   grant execute on function private.submit_game_choice(uuid, integer, integer, jsonb) to authenticated;
-- ============================================================================
