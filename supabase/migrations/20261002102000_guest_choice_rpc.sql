-- Chế độ khách: chấm từng lựa chọn qua RPC công khai, đáp án không rời máy chủ ở dạng bảng.
--
-- Bối cảnh (đã phân tích luồng dữ liệu trong app/domains/content/gateway.ts,
-- app/domains/training/*, app/page.tsx):
--   * Khách nạp nội dung qua get_public_site_content(), hàm này CỐ Ý gỡ correct /
--     moneyDelta / awarenessDelta / feedback của mọi lựa chọn.
--   * Frontend cũ chấm khách cục bộ bằng choice.correct từ payload; payload đã bị gỡ khóa
--     nên khách bị chấm "sai" với mức thay đổi 0. RPC evaluate_guest_choice lại bị thu hồi
--     ở 20260923085000.
--   * Ngoài ra anon còn quyền SELECT bảng public.site_content (đọc được toàn bộ đáp án);
--     việc thu hồi nằm ở supabase/post-deploy/ vì phải chờ frontend mới.
--
-- Migration này phục hồi đường chấm điểm đúng cho khách:
--   public.evaluate_guest_choice(scenario_id, choice_index) -> { scenarioId, choiceIndex,
--   correct, moneyDelta, awarenessDelta, feedback } cho MỘT lựa chọn. Không ghi dữ liệu
--   người dùng; được giới hạn tốc độ bởi private.data_api_pre_request() (route
--   rpc/evaluate_guest_choice). Hàm là VOLATILE (mặc định) vì hook giới hạn tốc độ ghi
--   vào private.api_rate_limits nên không được chạy trong giao dịch chỉ-đọc.
--
-- AN TOÀN KHI ÁP DỤNG BẤT KỲ THỨ TỰ NÀO với frontend: migration chỉ THÊM khả năng gọi
-- RPC; không đổi dữ liệu trả về của get_public_site_content và không thu hồi quyền nào.
-- Hạn chế còn lại (chấp nhận, ghi trong tài liệu): mỗi lần trả lời, khách nhận phản hồi
-- của lựa chọn đó theo thiết kế; client tự động có thể liệt kê 3 x N lựa chọn qua RPC. Chỉ
-- tiến trình đăng nhập (xác minh máy chủ) mới tạo chứng nhận chính thức.
-- Idempotent.

-- private.evaluate_choice: nhắc lại (giống harden_gameplay_content.sql) để migration đứng
-- độc lập, đồng thời fail-closed khi dữ liệu thiếu mức thay đổi (trước đây
-- (null)::integer làm balance bật lên mức tối đa trong private.submit_game_choice).
create or replace function private.evaluate_choice(scenario_id integer, choice_index integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  scenario_item jsonb;
  choice_item jsonb;
begin
  if choice_index is null or choice_index not between 0 and 2 then
    raise exception 'Invalid choice' using errcode = '22023';
  end if;

  select item into scenario_item
  from public.site_content content_row
  cross join lateral jsonb_array_elements(content_row.content->'scenarios') item
  where content_row.slug = 'main' and content_row.published
    and (item->>'id')::integer = scenario_id;
  if scenario_item is null then
    raise exception 'Scenario not found' using errcode = '22023';
  end if;

  choice_item := scenario_item->'choices'->choice_index;
  if choice_item is null
     or jsonb_typeof(choice_item->'correct') is distinct from 'boolean'
     or jsonb_typeof(choice_item->'moneyDelta') is distinct from 'number'
     or jsonb_typeof(choice_item->'awarenessDelta') is distinct from 'number' then
    raise exception 'Invalid scenario content' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'scenarioId', scenario_id,
    'choiceIndex', choice_index,
    'correct', (choice_item->>'correct')::boolean,
    'moneyDelta', (choice_item->>'moneyDelta')::integer,
    'awarenessDelta', (choice_item->>'awarenessDelta')::integer,
    'feedback', choice_item->>'feedback'
  );
end
$$;
revoke all on function private.evaluate_choice(integer, integer) from public, anon, authenticated;

create or replace function public.evaluate_guest_choice(scenario_id integer, choice_index integer)
returns jsonb
language sql
security definer
set search_path = ''
as $$ select private.evaluate_choice(scenario_id, choice_index) $$;

revoke all on function public.evaluate_guest_choice(integer, integer) from public;
grant execute on function public.evaluate_guest_choice(integer, integer) to anon, authenticated;

notify pgrst, 'reload schema';
