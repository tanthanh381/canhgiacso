#!/usr/bin/env bash
# Dựng cơ sở dữ liệu THỬ NGHIỆM: stub Supabase + schema + các SQL áp dụng tay +
# migrations theo đúng thứ tự README. CHỈ dùng cho CI/cục bộ; không dùng với
# Supabase production.
#
#   PGHOST=/var/run/postgresql PGPORT=5432 PGUSER=postgres \
#     supabase/tests/bootstrap.sh [tên_db] [--post-deploy] [--stop-before <tiền_tố_migration>]
#
#   --post-deploy   áp dụng thêm supabase/post-deploy/*.sql (chỉ dùng để thử bước post-deploy)
#   --stop-before X dừng TRƯỚC migration đầu tiên có tên >= X (vd 20261002100000), dùng để
#                   dựng trạng thái "production hiện tại" rồi thử migration trên dữ liệu có sẵn
#
# Biến môi trường libpq chuẩn (PGHOST, PGPORT, PGUSER, PGPASSWORD) được tôn trọng.
# Yêu cầu: psql, và (để chạy test) pgTAP + pg_prove.
set -euo pipefail

DB="${1:-cgs_test}"
WITH_POST_DEPLOY=0
STOP_BEFORE=""
args=("$@")
for ((i = 0; i < ${#args[@]}; i++)); do
  case "${args[$i]}" in
    --post-deploy) WITH_POST_DEPLOY=1 ;;
    --stop-before) STOP_BEFORE="${args[$((i + 1))]:-}" ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SUPA="$ROOT/supabase"
PSQL=(psql -X -v ON_ERROR_STOP=1 -q)

echo "==> Tạo CSDL thử nghiệm: $DB"
"${PSQL[@]}" -d postgres -c "drop database if exists \"$DB\" with (force)" \
  -c "create database \"$DB\""

run_sql() {
  echo "==> $1"
  "${PSQL[@]}" -d "$DB" -f "$1" >/dev/null
}

run_sql "$SUPA/tests/stubs/supabase_stub.sql"

# Thứ tự các script áp dụng tay (xem README, mục Dữ liệu và phân quyền).
for file in \
  schema.sql \
  admin_content.sql \
  content_roles.sql \
  secure_gameplay.sql \
  training_certificates.sql \
  harden_gameplay_content.sql \
  username_policy.sql
do
  run_sql "$SUPA/$file"
done

# Migrations theo thứ tự tên tệp (tương đương `supabase db push`).
for file in $(ls "$SUPA"/migrations/*.sql | sort); do
  name="$(basename "$file")"
  if [ -n "$STOP_BEFORE" ] && [[ "$name" > "$STOP_BEFORE" || "$name" == "$STOP_BEFORE"* ]]; then
    echo "==> Dừng trước $name (--stop-before $STOP_BEFORE)"
    break
  fi
  run_sql "$file"
done

if [ "$WITH_POST_DEPLOY" = "1" ]; then
  for file in $(ls "$SUPA"/post-deploy/*.sql 2>/dev/null | sort); do
    run_sql "$file"
  done
fi

# Giống Supabase: schema extensions nằm trong search_path mặc định của CSDL.
"${PSQL[@]}" -d "$DB" -c "alter database \"$DB\" set search_path = \"\$user\", public, extensions" >/dev/null
"${PSQL[@]}" -d "$DB" -c "create extension if not exists pgtap with schema extensions" >/dev/null
echo "==> Hoàn tất. Chạy: pg_prove -d $DB supabase/tests/database/*.test.sql"
