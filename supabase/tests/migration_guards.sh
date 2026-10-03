#!/usr/bin/env bash
# Kiểm thử các CHỐT AN TOÀN của migration 20261002100000..104000 trên một CSDL mô phỏng
# "production hiện tại" (đã có dữ liệu thật, chưa áp dụng migration mới).
#
#   PGHOST=/var/run/postgresql PGUSER=postgres supabase/tests/migration_guards.sh [tên_db]
#
# Kiểm tra:
#   1. Có admin/editor chưa xác nhận email  -> migration 20261002100000 DỪNG (CG003), không
#      đổi gì (hàm cũ còn nguyên, bảng mới không được tạo).
#   2. Sau khi xác nhận email -> migration chạy được; admin/editor giữ nguyên quyền.
#   3. Toàn bộ migration mới chạy lại 2 lần không lỗi (idempotent), không xoay khóa muối,
#      không xóa lại dữ liệu giới hạn tốc độ.
#   4. Không mất dữ liệu người dùng (profiles, user_progress, test_attempts, site_content,
#      app_admins, app_editors, auth.users).
#   5. Dữ liệu IP thô cũ của api_rate_limits bị loại bỏ (cột source_ip không còn).
set -euo pipefail

DB="${1:-cgs_guard}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SUPA="$ROOT/supabase"
FIRST=20261002100000
PSQL=(psql -X -v ON_ERROR_STOP=1 -q -d "$DB")
fail=0
checks=0

ok()   { checks=$((checks + 1)); echo "ok $checks - $1"; }
nok()  { checks=$((checks + 1)); fail=$((fail + 1)); echo "not ok $checks - $1"; }
q()    { "${PSQL[@]}" -Atc "$1"; }
expect() { # expect "mô tả" "giá trị mong đợi" "câu SQL"
  local got
  got="$(q "$3")"
  if [ "$got" = "$2" ]; then ok "$1"; else nok "$1 (mong đợi '$2', nhận '$got')"; fi
}

echo "# Dựng CSDL tới ngay trước $FIRST"
"$SUPA/tests/bootstrap.sh" "$DB" --stop-before "$FIRST" >/dev/null 2>&1

# Dữ liệu "production": admin + editor đã xác nhận, một admin và một editor CHƯA xác nhận,
# người chơi có tiến trình, nội dung đã xuất bản, một dòng giới hạn tốc độ có IP thô.
"${PSQL[@]}" >/dev/null <<'SQL'
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000a001', 'admin@hdbank.test',   now(), '{"username":"admin_a","display_name":"Admin A"}'),
  ('00000000-0000-0000-0000-00000000e001', 'editor@hdbank.test',  now(), '{"username":"editor_e","display_name":"Editor E"}'),
  ('00000000-0000-0000-0000-00000000f001', 'player@hdbank.test',  now(), '{"username":"player_p","display_name":"Player P"}'),
  ('00000000-0000-0000-0000-00000000a002', 'admin2@hdbank.test',  null,  '{"username":"admin_u","display_name":"Admin U"}'),
  ('00000000-0000-0000-0000-00000000e002', 'editor2@hdbank.test', null,  '{"username":"editor_u","display_name":"Editor U"}');
insert into private.app_admins (user_id) values
  ('00000000-0000-0000-0000-00000000a001'), ('00000000-0000-0000-0000-00000000a002');
insert into private.app_editors (user_id) values
  ('00000000-0000-0000-0000-00000000e001'), ('00000000-0000-0000-0000-00000000e002');
insert into public.user_progress (user_id, balance, awareness) values
  ('00000000-0000-0000-0000-00000000f001', 250000000, 80)
  on conflict (user_id) do update set balance = excluded.balance, awareness = excluded.awareness;
insert into public.test_attempts (user_id, scenario_id, choice_index, correct, balance_after, awareness_after) values
  ('00000000-0000-0000-0000-00000000f001', 1, 1, false, 250000000, 80);
insert into public.site_content (slug, content, published, updated_by) values
  ('main', '{"version":1,"scenarios":[]}'::jsonb, true, '00000000-0000-0000-0000-00000000a001')
  on conflict (slug) do nothing;
insert into private.api_rate_limits (source_ip, route) values ('203.0.113.7', 'rpc/record_web_analytics_event_v4');
-- Chứng nhận đã phát hành TRƯỚC migration (mã 10 ký tự hex): phải giữ nguyên và vẫn xác minh được.
insert into private.training_certificates (id, certificate_code, user_id, run_id, display_name, username, scenario_total, completed, correct, accuracy, score, rating)
values ('00000000-0000-0000-0000-0000000000c1', 'CGS-2025-0123456789', '00000000-0000-0000-0000-00000000f001',
        '00000000-0000-0000-0000-0000000000f1', 'Player P', 'player_p', 10, 10, 9, 90, 1100, 'XUẤT SẮC');
SQL

SNAPSHOT_SQL="select concat_ws(',',
  (select count(*) from auth.users),
  (select count(*) from public.profiles),
  (select count(*) from public.user_progress),
  (select count(*) from public.test_attempts),
  (select count(*) from public.site_content),
  (select count(*) from private.app_admins),
  (select count(*) from private.app_editors))"
BEFORE="$(q "$SNAPSHOT_SQL")"
OLD_ADMIN_DEF_HASH="$(q "select md5(pg_get_functiondef('private.user_is_app_admin()'::regprocedure))")"

echo "# 1. Chốt an toàn: có admin/editor chưa xác nhận email"
set +e
OUT="$("${PSQL[@]}" -v VERBOSITY=verbose -f "$SUPA/migrations/20261002100000_privileged_roles_require_confirmed_email.sql" 2>&1)"
RC=$?
set -e
if [ "$RC" -ne 0 ] && grep -q 'CG003' <<<"$OUT"; then ok "migration dừng với SQLSTATE CG003"; else nok "migration phải dừng với CG003 (rc=$RC)"; echo "$OUT" | head -5; fi
expect "hàm user_is_app_admin() cũ còn nguyên sau khi bị chặn" "$OLD_ADMIN_DEF_HASH" \
  "select md5(pg_get_functiondef('private.user_is_app_admin()'::regprocedure))"
expect "bảng privileged_email_domains không được tạo khi bị chặn" "t" \
  "select to_regclass('private.privileged_email_domains') is null"
expect "quyền admin/editor không bị đổi khi bị chặn" "2,2" \
  "select (select count(*) from private.app_admins) || ',' || (select count(*) from private.app_editors)"

echo "# 1b. Chỉ còn editor chưa xác nhận vẫn bị chặn"
q "update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-00000000a002'" >/dev/null
set +e
OUT="$("${PSQL[@]}" -v VERBOSITY=verbose -f "$SUPA/migrations/20261002100000_privileged_roles_require_confirmed_email.sql" 2>&1)"
RC=$?
set -e
if [ "$RC" -ne 0 ] && grep -q 'CG003' <<<"$OUT"; then ok "editor chưa xác nhận cũng chặn migration (CG003)"; else nok "editor chưa xác nhận phải chặn migration (rc=$RC)"; fi

echo "# 2. Sau khi xác nhận email -> migration chạy được, giữ nguyên quyền"
q "update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-00000000e002'" >/dev/null
for file in $(ls "$SUPA"/migrations/*.sql | sort); do
  name="$(basename "$file")"
  if [[ "$name" > "$FIRST" || "$name" == "$FIRST"* ]]; then
    if "${PSQL[@]}" -f "$file" >/dev/null 2>&1; then ok "áp dụng $name"; else nok "áp dụng $name"; fi
  fi
done
expect "admin/editor giữ nguyên quyền sau migration" "2,2" \
  "select (select count(*) from private.app_admins) || ',' || (select count(*) from private.app_editors)"

echo "# 4. Không mất dữ liệu"
expect "số dòng các bảng dữ liệu người dùng/nội dung không đổi" "$BEFORE" "$SNAPSHOT_SQL"
expect "tiến trình người chơi giữ nguyên" "250000000,80" \
  "select balance || ',' || awareness from public.user_progress where user_id = '00000000-0000-0000-0000-00000000f001'"

echo "# 4b. Chứng nhận đã phát hành giữ nguyên mã và vẫn xác minh được"
expect "mã chứng nhận cũ không bị đổi" "CGS-2025-0123456789" \
  "select certificate_code from private.training_certificates where id = '00000000-0000-0000-0000-0000000000c1'"
expect "mã cũ vẫn xác minh được qua RPC công khai" "true|P*** P***" \
  "select (public.verify_training_certificate('CGS-2025-0123456789') ->> 'valid') || '|' || (public.verify_training_certificate('CGS-2025-0123456789') ->> 'name')"

echo "# 5. IP thô của giới hạn tốc độ bị loại bỏ"
expect "cột source_ip không còn" "0" \
  "select count(*) from information_schema.columns where table_schema='private' and table_name='api_rate_limits' and column_name='source_ip'"
expect "dữ liệu giới hạn tốc độ cũ (IP thô) đã được dọn" "0" "select count(*) from private.api_rate_limits"

echo "# 3. Chạy lại toàn bộ migration mới (idempotent)"
SECRET_BEFORE="$(q "select value from private.security_settings where key='ip_hash_secret'")"
q "insert into private.api_rate_limits (source_ip_hash, route) values (repeat('a',64), 'rpc/x')" >/dev/null
for pass in 1 2; do
  pass_failed=0
  for file in $(ls "$SUPA"/migrations/*.sql | sort); do
    name="$(basename "$file")"
    if [[ "$name" > "$FIRST" || "$name" == "$FIRST"* ]]; then
      if ! "${PSQL[@]}" -f "$file" >/dev/null 2>&1; then
        pass_failed=1
        echo "# lỗi khi chạy lại lần $pass: $name"
      fi
    fi
  done
  if [ "$pass_failed" -eq 0 ]; then ok "chạy lại lần $pass: toàn bộ migration mới không lỗi"; else nok "chạy lại lần $pass: có migration lỗi"; fi
done
expect "khóa muối không bị xoay khi chạy lại" "$SECRET_BEFORE" "select value from private.security_settings where key='ip_hash_secret'"
expect "dòng giới hạn tốc độ mới không bị xóa khi chạy lại" "1" "select count(*) from private.api_rate_limits where route='rpc/x'"
expect "dữ liệu người dùng vẫn nguyên sau khi chạy lại" "$BEFORE" "$SNAPSHOT_SQL"

echo "# Tổng kết: $checks kiểm tra, $fail thất bại"
[ "$fail" -eq 0 ]
