# Hướng dẫn Setup PostgreSQL (psql) cho Nomad Diary

## 1. Thông tin hệ thống

Dự án sử dụng:

* PostgreSQL trên Amazon RDS
* Database: `nomad_diary`
* Schema chính: `nomad_diary`
* User kết nối: `postgres`
* Chứng chỉ SSL: `back-end/src/certs/global-bundle.pem`

> **Lưu ý**
>
> * Dự án **không sử dụng schema mặc định `public`**.
> * Toàn bộ bảng, view, function và trigger đều được tạo trong schema `nomad_diary`.
> * Mọi kết nối tới RDS đều sử dụng SSL với chứng chỉ của AWS.

---

# 2. Kiểm tra chứng chỉ SSL

Sau khi clone project lên EC2, kiểm tra file chứng chỉ:

```bash
ls -l /home/ubuntu/nomad-diary/back-end/src/certs/global-bundle.pem
```

Nếu hiển thị thông tin file thì chứng chỉ đã sẵn sàng để sử dụng.

---

# 3. Kết nối tới PostgreSQL

```bash
psql \
  --host=nomad-diary-db.c164ase8w3e1.ap-southeast-1.rds.amazonaws.com \
  --port=5432 \
  --username=postgres \
  --dbname=nomad_diary \
  "sslmode=verify-full sslrootcert=/home/ubuntu/nomad-diary/back-end/src/certs/global-bundle.pem"
```

Sau khi nhập mật khẩu thành công sẽ xuất hiện:

```text
nomad_diary=>
```

---

# 4. Kiểm tra database hiện tại

```sql
SELECT current_database();
```

Ví dụ:

```text
 current_database
------------------
 nomad_diary
```

---

# 5. Kiểm tra user hiện tại

```sql
SELECT current_user;
```

Ví dụ:

```text
 current_user
--------------
 postgres
```

---

# 6. Kiểm tra các schema

```sql
SELECT
    schema_name
FROM information_schema.schemata
ORDER BY schema_name;
```

Ví dụ:

```text
information_schema
nomad_diary
pg_catalog
public
```

---

# 7. Chạy file khởi tạo database

File:

```text
database/nomad-diary.sql
```

Trong `psql`:

```sql
\i /home/ubuntu/nomad-diary/database/nomad-diary.sql
```

Hoặc từ terminal:

```bash
psql \
  --host=nomad-diary-db.c164ase8w3e1.ap-southeast-1.rds.amazonaws.com \
  --port=5432 \
  --username=postgres \
  --dbname=nomad_diary \
  "sslmode=verify-full sslrootcert=/home/ubuntu/nomad-diary/back-end/src/certs/global-bundle.pem" \
  --file=/home/ubuntu/nomad-diary/database/nomad-diary.sql
```

Nếu thành công sẽ xuất hiện các thông báo tương tự:

```text
CREATE SCHEMA
CREATE TABLE
CREATE VIEW
CREATE FUNCTION
CREATE TRIGGER
COMMIT
```

---

# 8. Chạy dữ liệu mẫu (Seed)

File:

```text
database/nomad-diary-seed.sql
```

Trong `psql`:

```sql
\i /home/ubuntu/nomad-diary/database/nomad-diary-seed.sql
```

Hoặc từ terminal:

```bash
psql \
  --host=nomad-diary-db.c164ase8w3e1.ap-southeast-1.rds.amazonaws.com \
  --port=5432 \
  --username=postgres \
  --dbname=nomad_diary \
  "sslmode=verify-full sslrootcert=/home/ubuntu/nomad-diary/back-end/src/certs/global-bundle.pem" \
  --file=/home/ubuntu/nomad-diary/database/nomad-diary-seed.sql
```

Seed chỉ ghi các S3 object key mẫu vào `avatar_key`, `thumbnail_key` và `image_key`; lệnh này không upload ảnh lên S3. Backend ghép các key này với `AWS_CLOUDFRONT_IMAGE_BASE_URL` khi trả dữ liệu. Muốn đọc được ảnh seed qua CloudFront, bucket ảnh phải chứa object đúng key trong seed và distribution phải được phép đọc bucket qua OAC. Nếu object chưa tồn tại, CloudFront sẽ trả lỗi từ origin S3.

---

# 9. Kiểm tra các bảng

Do dự án sử dụng schema `nomad_diary`, kiểm tra bằng:

```sql
SELECT
    table_name
FROM information_schema.tables
WHERE table_schema = 'nomad_diary'
ORDER BY table_name;
```

Không nên kiểm tra schema `public` vì dự án không tạo bảng tại đó.

---

# 10. Thiết lập schema mặc định

Để không cần ghi `nomad_diary.` trước tên bảng:

```sql
SET search_path TO nomad_diary;
```

Kiểm tra:

```sql
SHOW search_path;
```

Ví dụ:

```text
 search_path
-------------
 nomad_diary
```

Sau đó có thể truy vấn:

```sql
SELECT *
FROM users;
```

Thay vì:

```sql
SELECT *
FROM nomad_diary.users;
```

> `SET search_path` chỉ có hiệu lực trong phiên kết nối hiện tại.

---

# 11. Kiểm tra dữ liệu

Đếm số bản ghi:

```sql
SELECT COUNT(*)
FROM users;
```

Hoặc:

```sql
SELECT COUNT(*)
FROM nomad_diary.users;
```

---

# 12. Xem dữ liệu

```sql
SELECT *
FROM users
LIMIT 10;
```

Hoặc:

```sql
SELECT *
FROM nomad_diary.users
LIMIT 10;
```

---

# 13. Xem cấu trúc bảng

```sql
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'nomad_diary'
  AND table_name = 'users'
ORDER BY ordinal_position;
```

---

# 14. Thoát khỏi PostgreSQL

```sql
\q
```

---

# 15. Quy trình khởi tạo database

1. Tạo PostgreSQL trên Amazon RDS.
2. Đảm bảo EC2 có thể kết nối tới RDS (Security Group và VPC).
3. Kiểm tra file chứng chỉ `back-end/src/certs/global-bundle.pem`.
4. Kết nối tới RDS bằng `psql` sử dụng `sslmode=verify-full`.
5. Chạy `database/nomad-diary.sql`.
6. Chạy `database/nomad-diary-seed.sql`.
7. Kiểm tra các bảng trong schema `nomad_diary`.
8. Thiết lập `search_path` nếu muốn thao tác nhanh hơn.

---

# 16. Lưu ý

* Database: `nomad_diary`
* Schema chính: `nomad_diary`
* Không lưu bảng trong schema `public`.
* Luôn kết nối bằng SSL và sử dụng chứng chỉ `global-bundle.pem`.
* Khi viết truy vấn, ưu tiên:

  * `nomad_diary.users`
  * Hoặc `SET search_path TO nomad_diary;` rồi truy vấn trực tiếp `users`.
