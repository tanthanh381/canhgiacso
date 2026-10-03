-- Quản trị nội dung: mọi thay đổi phải đi qua RPC có kiểm tra cấu trúc + nhật ký kiểm toán.
--
-- Vấn đề (trước migration này):
--   * Frontend gọi public.save_managed_site_content / public.set_content_manager_role.
--     Đây là hai hàm SECURITY DEFINER độc lập, KHÔNG gọi private.log_security_event,
--     trong khi bản private (có audit) không được ai gọi.
--   * Vai trò authenticated còn quyền INSERT/UPDATE/DELETE trực tiếp trên
--     public.site_content (RLS chỉ giới hạn theo vai trò), nên có thể bỏ qua kiểm tra
--     cấu trúc và audit của RPC.
--
-- Nội dung:
--   1. Hàm kiểm tra cấu trúc điểm số/đáp án (private.validate_site_content_scoring),
--      để dữ liệu thiếu moneyDelta/awarenessDelta không làm hỏng chấm điểm máy chủ.
--   2. private.save_managed_site_content dùng hàm kiểm tra trên (giữ nguyên audit).
--   3. public.save_managed_site_content và public.set_content_manager_role ủy quyền
--      sang bản private. Chữ ký và kết quả trả về GIỮ NGUYÊN so với frontend hiện tại
--      (grep app/: chỉ gọi rpc("save_managed_site_content"|"set_content_manager_role")).
--   4. Thu hồi INSERT/UPDATE/DELETE (và TRUNCATE/REFERENCES/TRIGGER) trực tiếp trên
--      public.site_content khỏi anon/authenticated. SELECT được giữ lại cho tới bước
--      post-deploy (supabase/post-deploy/), vì chỉ khi đó mới an toàn thu hồi.
--   5. Chuẩn hóa quyền bảng người dùng theo nguyên tắc tối thiểu (profiles,
--      user_progress, test_attempts): bỏ quyền thừa do default privileges của Supabase.
--
-- Đã xác nhận bằng grep: không có đường mã nào ghi thẳng bảng (không có
-- .from('site_content')), các bảng profile/progress chỉ được đọc qua RPC hoặc select
-- cột của chính mình và cập nhật display_name.
-- Idempotent: chạy lại an toàn. Yêu cầu: migration 20261002100000 đã áp dụng.

-- 1. Kiểm tra cấu trúc điểm số -----------------------------------------------------
-- Trả về NULL khi hợp lệ, hoặc mô tả lỗi. Phản chiếu normalizeSiteContent(..., true)
-- ở frontend (app/data.ts): id 1..100 không trùng, 3 lựa chọn, đúng 1 đáp án đúng,
-- moneyDelta/awarenessDelta là số nguyên trong giới hạn, feedback không rỗng.
create or replace function private.validate_site_content_scoring(content jsonb)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  scenario_item jsonb;
  choice_item jsonb;
  scenario_ids integer[] := '{}';
  scenario_id integer;
  correct_count integer;
begin
  if jsonb_typeof(content) is distinct from 'object'
     or jsonb_typeof(content->'scenarios') is distinct from 'array'
     or jsonb_array_length(content->'scenarios') < 1
     or jsonb_array_length(content->'scenarios') > 100 then
    return 'content must contain 1 to 100 scenarios';
  end if;

  for scenario_item in select value from jsonb_array_elements(content->'scenarios') loop
    if jsonb_typeof(scenario_item) is distinct from 'object' then
      return 'scenario must be an object';
    end if;
    if jsonb_typeof(scenario_item->'id') is distinct from 'number'
       or (scenario_item->>'id') !~ '^[0-9]{1,3}$' then
      return 'scenario id must be an integer between 1 and 100';
    end if;
    scenario_id := (scenario_item->>'id')::integer;
    if scenario_id not between 1 and 100 then
      return 'scenario id must be an integer between 1 and 100';
    end if;
    if scenario_id = any(scenario_ids) then
      return format('scenario id %s is duplicated', scenario_id);
    end if;
    scenario_ids := scenario_ids || scenario_id;

    if coalesce(scenario_item->>'difficulty', '') not in ('Dễ', 'Trung bình', 'Khó', 'Rất khó') then
      return format('scenario %s has an invalid difficulty', scenario_id);
    end if;
    if jsonb_typeof(scenario_item->'choices') is distinct from 'array'
       or jsonb_array_length(scenario_item->'choices') <> 3 then
      return format('scenario %s must have exactly three choices', scenario_id);
    end if;

    correct_count := 0;
    for choice_item in select value from jsonb_array_elements(scenario_item->'choices') loop
      if jsonb_typeof(choice_item) is distinct from 'object'
         or jsonb_typeof(choice_item->'text') is distinct from 'string'
         or btrim(choice_item->>'text') = ''
         or char_length(choice_item->>'text') > 500 then
        return format('scenario %s has a choice with invalid text', scenario_id);
      end if;
      if jsonb_typeof(choice_item->'correct') is distinct from 'boolean' then
        return format('scenario %s has a choice without a boolean correct flag', scenario_id);
      end if;
      if (choice_item->>'correct')::boolean then
        correct_count := correct_count + 1;
      end if;
      if jsonb_typeof(choice_item->'moneyDelta') is distinct from 'number'
         or (choice_item->>'moneyDelta') !~ '^-?[0-9]{1,9}$'
         or abs((choice_item->>'moneyDelta')::bigint) > 300000000 then
        return format('scenario %s has a choice with an invalid moneyDelta', scenario_id);
      end if;
      if jsonb_typeof(choice_item->'awarenessDelta') is distinct from 'number'
         or (choice_item->>'awarenessDelta') !~ '^-?[0-9]{1,3}$'
         or abs((choice_item->>'awarenessDelta')::integer) > 100 then
        return format('scenario %s has a choice with an invalid awarenessDelta', scenario_id);
      end if;
      if jsonb_typeof(choice_item->'feedback') is distinct from 'string'
         or btrim(choice_item->>'feedback') = ''
         or char_length(choice_item->>'feedback') > 1200 then
        return format('scenario %s has a choice with invalid feedback', scenario_id);
      end if;
    end loop;

    if correct_count <> 1 then
      return format('scenario %s must have exactly one correct choice', scenario_id);
    end if;
  end loop;

  return null;
end;
$$;
revoke all on function private.validate_site_content_scoring(jsonb) from public, anon, authenticated;

-- 2. Lưu nội dung (có audit) -----------------------------------------------------
create or replace function private.save_managed_site_content(target_slug text, target_content jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  is_published boolean;
  saved_at timestamptz := clock_timestamp();
  validation_error text;
begin
  if not private.user_can_edit_content() then
    raise log 'security_event action=CONTENT_WRITE_DENIED actor=% aal=%', auth.uid(), coalesce(auth.jwt()->>'aal', 'aal1');
    raise exception 'Content management access and MFA required' using errcode = '42501';
  end if;

  if target_slug not in ('main', 'main-draft') then
    raise exception 'Invalid content target' using errcode = '22023';
  end if;

  is_published := target_slug = 'main';
  if is_published and not private.user_is_app_admin() then
    raise log 'security_event action=CONTENT_PUBLISH_DENIED actor=% aal=%', auth.uid(), coalesce(auth.jwt()->>'aal', 'aal1');
    raise exception 'Administrator access and MFA required to publish' using errcode = '42501';
  end if;

  if jsonb_typeof(target_content) is distinct from 'object'
     or jsonb_typeof(target_content->'scenarios') is distinct from 'array'
     or jsonb_array_length(target_content->'scenarios') < 1
     or pg_column_size(target_content) > 1048576 then
    raise exception 'Invalid site content' using errcode = '22023';
  end if;

  validation_error := private.validate_site_content_scoring(target_content);
  if validation_error is not null then
    raise exception 'Invalid site content: %', validation_error using errcode = '22023';
  end if;

  insert into public.site_content(slug, content, published, updated_by, updated_at)
  values(target_slug, target_content, is_published, uid, saved_at)
  on conflict (slug) do update set
    content = excluded.content,
    published = excluded.published,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  perform private.log_security_event(
    case when is_published then 'CONTENT_PUBLISHED' else 'CONTENT_DRAFT_SAVED' end,
    'site_content', target_slug, 'success',
    jsonb_build_object('payload_bytes', pg_column_size(target_content))
  );

  return jsonb_build_object('slug', target_slug, 'updated_at', saved_at);
end
$$;

revoke all on function private.save_managed_site_content(text, jsonb) from public, anon;
grant execute on function private.save_managed_site_content(text, jsonb) to authenticated;

-- 3. Hàm công khai ủy quyền sang bản private --------------------------------------
-- SECURITY INVOKER: auth.uid()/auth.jwt() là của người gọi; quyền thực thi bản private
-- chỉ cấp cho authenticated; bản private là SECURITY DEFINER nên ghi được bảng.
create or replace function public.save_managed_site_content(target_slug text, target_content jsonb)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.save_managed_site_content(target_slug, target_content)
$$;

revoke all on function public.save_managed_site_content(text, jsonb) from public, anon;
grant execute on function public.save_managed_site_content(text, jsonb) to authenticated;

-- (đã định nghĩa ở 20261002100000; nhắc lại để migration này đứng độc lập)
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

-- 4. Không còn ghi trực tiếp vào public.site_content -------------------------------
revoke insert, update, delete, truncate, references, trigger
  on table public.site_content from anon, authenticated;

-- 5. Quyền tối thiểu cho bảng người dùng -------------------------------------------
-- Frontend: profiles — select (username, display_name, created_at) + update display_name;
-- user_progress/test_attempts — chỉ đọc/ghi qua RPC máy chủ (get_game_state ...).
revoke all on table public.profiles from anon;
revoke insert, delete, truncate, references, trigger on table public.profiles from authenticated;
revoke update on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

revoke all on table public.user_progress from anon;
revoke insert, update, delete, truncate, references, trigger on table public.user_progress from authenticated;
grant select on table public.user_progress to authenticated;

revoke all on table public.test_attempts from anon;
revoke insert, update, delete, truncate, references, trigger on table public.test_attempts from authenticated;
grant select on table public.test_attempts to authenticated;

notify pgrst, 'reload schema';
