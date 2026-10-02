-- Xác minh chứng nhận bằng mã: bên thứ ba (nhà tuyển dụng, đơn vị đào tạo) nhập mã in trên
-- chứng nhận để biết mã có thật hay không.
--
-- public.verify_training_certificate(code text) -> jsonb, gọi được bởi anon.
--   Hợp lệ:   { valid: true, name: "N*** V*** A***", issuedOn: "2026-10-02",
--               rating, accuracy, scenarioTotal, completed }
--   Còn lại:  { valid: false } hoặc { valid: false, kind: "guest" } (mã bản ghi nhận chế độ khách).
-- TỐI THIỂU theo thiết kế: không email, không tên đăng nhập, không mã tài khoản, không
-- run_id / certificate id, không điểm chi tiết; tên hiển thị chỉ còn chữ cái đầu mỗi từ.
--
-- Thiết kế an toàn:
--   * Mã sai KHÔNG raise lỗi mà trả { valid: false }: lệnh gọi lỗi bị rollback cùng dòng giới
--     hạn tốc độ nên sẽ không được đếm; trả bình thường thì private.data_api_pre_request đếm
--     được (route rpc/verify_training_certificate, xem 20261002132000).
--   * Hàm VOLATILE để PostgREST chỉ nhận POST (hook giới hạn tốc độ chỉ áp dụng cho
--     POST/PUT/PATCH/DELETE; hàm STABLE có thể bị gọi bằng GET và né giới hạn).
--   * Mã chứng nhận (private.training_certificates.certificate_code) đã sinh từ
--     gen_random_uuid() (nguồn ngẫu nhiên mật mã), không tuần tự và không suy ra được từ
--     dữ liệu khác. Mã cũ có 10 ký tự hex (40 bit); trigger bên dưới nâng mã của chứng nhận
--     MỚI lên 16 ký tự hex (64 bit). Mã cũ GIỮ NGUYÊN vì đã in trên chứng nhận đã phát hành;
--     không cần backfill. Hàm xác minh chấp nhận cả hai độ dài.
--   * Sau khi tài khoản bị xóa, chứng nhận bị xóa theo (ON DELETE CASCADE) nên mã không còn
--     xác minh được.
-- Idempotent: chạy lại an toàn.

-- 1. Mã mới có entropy cao hơn -------------------------------------------------------------
create or replace function private.new_certificate_code()
returns text
language sql
volatile
set search_path = ''
as $$
  -- 12 ký tự đầu của UUID v4 hoàn toàn ngẫu nhiên (ký tự thứ 13 là cố định "4"):
  -- ghép 12 + 4 ký tự từ hai UUID độc lập = 64 bit ngẫu nhiên.
  select 'CGS-' || to_char(clock_timestamp(), 'YYYY') || '-'
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
             || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))
$$;
revoke all on function private.new_certificate_code() from public, anon, authenticated;

-- Trigger thay vì sửa private.ensure_training_certificate để không phụ thuộc phiên bản
-- hàm đang chạy trên production. Chỉ đổi mã khi nó đúng dạng cũ do hàm đó sinh ra.
create or replace function private.upgrade_certificate_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.certificate_code ~ '^CGS-[0-9]{4}-[0-9A-F]{10}$' then
    new.certificate_code := private.new_certificate_code();
  end if;
  return new;
end;
$$;
revoke all on function private.upgrade_certificate_code() from public, anon, authenticated;

drop trigger if exists training_certificates_upgrade_code on private.training_certificates;
create trigger training_certificates_upgrade_code
before insert on private.training_certificates
for each row execute function private.upgrade_certificate_code();

-- 2. Che tên hiển thị -----------------------------------------------------------------------
create or replace function private.mask_display_name(full_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    string_agg(left(word, 1) || '***', ' ' order by ord) filter (where ord <= 4),
    ''
  )
  from unnest(regexp_split_to_array(btrim(coalesce(full_name, '')), '\s+')) with ordinality as parts(word, ord)
  where word <> ''
$$;
revoke all on function private.mask_display_name(text) from public, anon, authenticated;

-- 3. RPC công khai --------------------------------------------------------------------------
create or replace function public.verify_training_certificate(code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text := upper(regexp_replace(coalesce(code, ''), '\s+', '', 'g'));
  certificate_row private.training_certificates;
begin
  if char_length(normalized) > 64 then
    return jsonb_build_object('valid', false);
  end if;

  if normalized ~ '^CGS-GUEST-[0-9A-Z]{4,32}$' then
    return jsonb_build_object('valid', false, 'kind', 'guest');
  end if;

  if normalized !~ '^CGS-[0-9]{4}-[0-9A-F]{10,32}$' then
    return jsonb_build_object('valid', false);
  end if;

  select * into certificate_row
  from private.training_certificates c
  where c.certificate_code = normalized;
  if not found then
    return jsonb_build_object('valid', false);
  end if;

  return jsonb_build_object(
    'valid', true,
    'name', private.mask_display_name(certificate_row.display_name),
    'issuedOn', to_char(certificate_row.issued_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD'),
    'rating', certificate_row.rating,
    'accuracy', certificate_row.accuracy,
    'scenarioTotal', certificate_row.scenario_total,
    'completed', certificate_row.completed
  );
end;
$$;

revoke all on function public.verify_training_certificate(text) from public;
grant execute on function public.verify_training_certificate(text) to anon, authenticated;

notify pgrst, 'reload schema';
