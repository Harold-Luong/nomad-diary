# PostgreSQL trên Amazon RDS

Hướng dẫn kết nối Nomad Diary tới PostgreSQL RDS bằng SSL, chạy migration và
kiểm tra database sau thay đổi. Các lệnh dùng placeholder để tránh ghi endpoint,
username hoặc credential production vào repository.

## Phạm vi

- Database mặc định: `nomad_diary`.
- Schema ứng dụng: `nomad_diary`.
- Region backend hiện dùng: `ap-southeast-1`.
- CA bundle trong repo: `back-end/src/certs/global-bundle.pem`.

Tài liệu này không tạo RDS instance, subnet group, Security Group, parameter
group hoặc secret. Các tài nguyên đó phải tồn tại trước.

## Điều kiện trước khi kết nối

- Máy chạy `psql` có network route tới RDS.
- Security Group của RDS cho phép TCP 5432 từ đúng source.
- DNS resolve được endpoint RDS.
- Database user có quyền cần thiết.
- CA bundle tồn tại và còn phù hợp.
- Có snapshot/backup trước migration production.

Kiểm tra certificate từ thư mục gốc repository:

```bash
test -f back-end/src/certs/global-bundle.pem
```

## Kết nối SSL

Dùng một PostgreSQL connection string duy nhất:

```bash
psql "host=<rds-endpoint> port=5432 dbname=nomad_diary user=<db-user> sslmode=verify-full sslrootcert=$(pwd)/back-end/src/certs/global-bundle.pem"
```

Nếu đang ở thư mục khác, thay `$(pwd)/...` bằng đường dẫn tuyệt đối tới CA
bundle. `verify-full` kiểm tra cả CA và hostname, vì vậy `host` phải là
endpoint DNS của RDS, không phải IP.

Không đưa password vào command line hoặc commit `.pgpass`. Để `psql` hỏi
password hoặc cấu hình credential an toàn trên máy vận hành.

## Xác nhận đúng target

Chạy các lệnh read-only trước mọi migration:

```sql
SELECT current_database();
SELECT current_user;
SELECT inet_server_addr(), inet_server_port();
SHOW ssl;
SHOW search_path;
```

Liệt kê schema:

```sql
SELECT schema_name
FROM information_schema.schemata
ORDER BY schema_name;
```

## Chọn quy trình thay đổi

| Tình trạng database | Quy trình |
| --- | --- |
| Database local/test rỗng, có thể xóa | Chạy schema đầy đủ, tùy chọn seed |
| Database đã có dữ liệu | Chạy migration chưa áp dụng |
| Production | Snapshot, migration tăng dần, kiểm tra; không seed |

### Khởi tạo database rỗng

> Cảnh báo: `nomad-diary.sql` có `DROP SCHEMA nomad_diary CASCADE`. Không chạy
> trên database có dữ liệu cần giữ.

Từ thư mục gốc repository:

```bash
psql \
  -v ON_ERROR_STOP=1 \
  -f database/nomad-diary.sql \
  "host=<rds-endpoint> port=5432 dbname=nomad_diary user=<db-user> sslmode=verify-full sslrootcert=$(pwd)/back-end/src/certs/global-bundle.pem"
```

Seed chỉ dành cho môi trường development/test có thể xóa:

```bash
psql \
  -v ON_ERROR_STOP=1 \
  -f database/nomad-diary-seed.sql \
  "host=<rds-endpoint> port=5432 dbname=nomad_diary user=<db-user> sslmode=verify-full sslrootcert=$(pwd)/back-end/src/certs/global-bundle.pem"
```

> Seed truncate toàn bộ bảng ứng dụng. Không seed production.

### Chạy migration

Migration hiện có:

```text
database/migrations/20260814_store_trip_locations.sql
```

Chạy từ thư mục gốc:

```bash
psql \
  -v ON_ERROR_STOP=1 \
  -f database/migrations/20260814_store_trip_locations.sql \
  "host=<rds-endpoint> port=5432 dbname=nomad_diary user=<db-user> sslmode=verify-full sslrootcert=$(pwd)/back-end/src/certs/global-bundle.pem"
```

File migration tự mở transaction và dùng `SET LOCAL search_path TO
nomad_diary, public`. `ON_ERROR_STOP=1` làm `psql` dừng khi gặp lỗi thay vì
tiếp tục sang câu lệnh sau.

Repo chưa có migration history table/runner. Người vận hành phải ghi nhận
migration đã áp dụng theo môi trường để tránh chạy nhầm hoặc bỏ sót.

## Chạy file trong phiên psql

Nếu đã kết nối:

```sql
\set ON_ERROR_STOP on
\i /absolute/path/to/nomad-diary/database/migrations/20260814_store_trip_locations.sql
```

Luôn dùng đường dẫn tuyệt đối để tránh chạy nhầm file do working directory của
`psql`.

## Kiểm tra sau migration

Đặt schema cho phiên hiện tại:

```sql
SET search_path TO nomad_diary, public;
SHOW search_path;
```

Liệt kê table:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'nomad_diary'
ORDER BY table_name;
```

Kiểm tra thay đổi `places`:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'nomad_diary'
  AND table_name = 'places'
  AND column_name IN ('ward_code', 'catalog_place_id', 'latitude', 'longitude')
ORDER BY column_name;
```

Kiểm tra index:

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'nomad_diary'
  AND tablename = 'places'
ORDER BY indexname;
```

Readiness của backend cũng phải thành công:

```bash
curl --fail-with-body https://api.nomad-diary.site/health/ready
```

## Search path

`SET search_path` chỉ có hiệu lực trong phiên hiện tại:

```sql
SET search_path TO nomad_diary, public;
SELECT COUNT(*) FROM users;
```

Trong application query, ưu tiên tên schema rõ ràng hoặc bảo đảm pool đã đặt
search path đúng. Không di chuyển table ứng dụng sang schema `public`.

## Rollback và sự cố

- Nếu migration chưa commit và đang lỗi trong transaction, `ROLLBACK;`.
- Nếu migration đã commit, không tự chạy schema reset để “sửa nhanh”.
- Dùng migration ngược đã review hoặc restore snapshot theo kế hoạch vận hành.
- Khi lỗi SSL, kiểm tra hostname, CA path, quyền đọc file và thời gian hệ thống.
- Khi timeout, kiểm tra VPC route, subnet, Security Group và Network ACL.
- Khi permission denied, kiểm tra owner/grant; không đổi sang superuser rộng hơn
  nếu chưa xác định câu lệnh cần quyền gì.

## Checklist production

- [ ] Xác nhận AWS account/region và endpoint.
- [ ] Xác nhận database/user bằng query read-only.
- [ ] Snapshot/backup hoàn tất.
- [ ] Migration đã review và chưa được áp dụng.
- [ ] Chạy với SSL `verify-full` và `ON_ERROR_STOP=1`.
- [ ] Kiểm tra column/index/data sau migration.
- [ ] Kiểm tra backend `/health/ready`.
- [ ] Ghi nhận migration và thời điểm áp dụng.

## Tài liệu liên quan

- [Database](README.md)
- [Tổng quan repository](../README.md)
- [Backend API](../back-end/README.md)
- [Mục lục tài liệu](../docs/README.md)
