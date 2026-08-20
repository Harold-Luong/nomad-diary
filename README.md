# Nomad Diary

Nomad Diary là ứng dụng nhật ký du lịch cá nhân để lưu chuyến đi, từng lần ghé
địa điểm, ảnh, đánh giá và dấu chân tỉnh/thành. Dữ liệu nghiệp vụ luôn được giới
hạn theo người dùng; hệ thống hiện chưa phải mạng xã hội công khai.

## Tổng quan hệ thống

| Module | Vai trò | Runtime/lưu trữ |
| --- | --- | --- |
| `front-end` | Giao diện web, quản lý session và gọi API | Vue 3, Vite, Pinia |
| `back-end` | REST API, auth, nghiệp vụ và presigned upload | Node.js 20+, Express 5, PostgreSQL |
| `database` | Schema, migration, seed và ERD | PostgreSQL 14+ |
| `location-catalog-lambda` | Catalog tỉnh, phường/xã và địa điểm read-only | Node.js 22, Lambda, DynamoDB |

Tài liệu chi tiết và quy ước cập nhật được tập trung tại
[docs/README.md](docs/README.md).

## Kiến trúc

```text
Browser (Vue)
   |-- REST + Bearer access token ---------> Express API ---> PostgreSQL
   |          refresh cookie HttpOnly              |
   |                                               +--------> S3 (presigned PUT)
   |                                                          |
   |                                                          v
   |                                                      CloudFront
   |
   +-- GET public catalog -----------------> API Gateway ---> Lambda ---> DynamoDB
```

Frontend gọi backend cho dữ liệu riêng của user và gọi Location Catalog để lấy
danh mục địa lý. Khi lưu trip stop, backend tạo hoặc tái sử dụng province/place
trong cùng transaction; production không cần seed toàn bộ catalog vào
PostgreSQL.

## Tính năng chính

- Đăng ký, đăng nhập, refresh token xoay vòng, đăng xuất, cập nhật hồ sơ, đổi
  mật khẩu và soft-delete tài khoản.
- CRUD chuyến đi; lọc theo trạng thái, năm, từ khóa; phân trang và soft delete.
- Thêm, sửa, xóa, sắp xếp trip stop; hỗ trợ địa điểm catalog và nhập thủ công.
- Thống kê tỉnh đã ghé và danh sách địa điểm theo từng người dùng.
- Upload avatar, ảnh bìa và ảnh hành trình trực tiếp lên S3 bằng presigned URL.
- Đọc EXIF ở frontend, lưu metadata ảnh và phân phối ảnh qua CloudFront.
- Tạo, sửa và xóa review gắn với từng lần ghé.
- Query Location Catalog theo tỉnh/phường, prefix tên, featured và cursor.

## Cấu trúc repository

```text
nomad-diary/
├── back-end/                 # Express REST API
├── database/                 # PostgreSQL schema, migration, seed và ERD
├── docs/                     # Mục lục và quy ước tài liệu
├── front-end/                # Vue application
├── location-catalog-lambda/  # Lambda query DynamoDB
└── README.md                 # Tổng quan và khởi động nhanh
```

## Yêu cầu

- Node.js 20.19+ hoặc 22.12+ cho frontend; Node.js 20+ cho backend.
- Node.js 22+ cho Location Catalog Lambda.
- PostgreSQL 14+ và `psql` cho database local.
- Docker và Docker Compose nếu chạy Lambda container local.
- AWS S3/CloudFront/Secrets Manager cho backend production.
- AWS Lambda/API Gateway/DynamoDB/ECR cho Location Catalog production.

## Khởi động nhanh

### 1. Database

Từ thư mục gốc repository:

```bash
createdb -U postgres nomad_diary
psql -v ON_ERROR_STOP=1 -U postgres -d nomad_diary -f database/nomad-diary.sql
psql -v ON_ERROR_STOP=1 -U postgres -d nomad_diary -f database/nomad-diary-seed.sql
```

Hai script trên chỉ dành cho local/test: schema script xóa schema
`nomad_diary`, còn seed truncate dữ liệu trước khi nạp mẫu. Database đã có dữ
liệu phải dùng migration trong `database/migrations/`.

### 2. Backend

```bash
cd back-end
npm install
npm run dev
```

Tạo `back-end/.env.development` theo
[hướng dẫn backend](back-end/README.md#cấu-hình-môi-trường). API mặc định:
`http://localhost:3000`; Swagger:
`http://localhost:3000/api-docs`.

### 3. Frontend

```bash
cd front-end
npm install
npm run dev
```

Tạo `front-end/.env.development` theo
[hướng dẫn frontend](front-end/README.md#cấu-hình-môi-trường). Vite chạy cố định
tại `http://127.0.0.1:5173` theo `vite.config.js`.

### 4. Location Catalog Lambda

```bash
cd location-catalog-lambda
npm ci
docker compose build
docker compose up
```

Runtime Interface Emulator nhận invoke tại
`http://localhost:9000/2015-03-31/functions/function/invocations`. Health
không cần DynamoDB; các route dữ liệu cần AWS credentials và bảng đúng contract.

## Biến môi trường quan trọng

| Module | Biến |
| --- | --- |
| Frontend | `VITE_API_BASE_URL`, `VITE_LOCATION_CATALOG_BASE_URL` |
| Backend | `DATABASE_*`, `JWT_*`, `CORS_ORIGIN`, `AWS_S3_IMAGE_BUCKET`, `AWS_CLOUDFRONT_IMAGE_BASE_URL`, `UPLOAD_MAX_SIZE_MB` |
| Lambda | Region và table hiện đang cố định trong source; `LOG_LEVEL` trong Compose chưa được handler sử dụng |

Không đặt secret trong biến `VITE_*`: mọi giá trị này được đóng gói vào bundle
và người dùng trình duyệt có thể đọc được.

`VITE_SWAGGER_URL` còn có trong `.env.development` nhưng source hiện không đọc
biến này; không nên phụ thuộc vào nó cho tới khi có consumer trong frontend.

## Authentication

Backend trả access token trong response và refresh token trong cookie
`HttpOnly`, `SameSite=Strict`; cookie chỉ bật `Secure` ở production.
Frontend giữ access token và user trong memory, không ghi dữ liệu xác thực vào
`localStorage` hoặc `sessionStorage`.

Khi reload hoặc mở tab mới, frontend thử nhận session từ tab cùng origin rồi gọi
`POST /auth/refresh-token` bằng cookie. Các request cùng nhận `401` dùng chung
một refresh lock để tránh xoay token nhiều lần. Vì request dùng cookie, backend
phải cho phép đúng frontend origin và credentials.

## API chính

### Backend

| Nhóm | Endpoint |
| --- | --- |
| Health/docs | `/`, `/health`, `/health/ready`, `/api-docs`, `/api-docs.json` |
| Auth | `/auth/register`, `/auth/login`, `/auth/refresh-token`, `/auth/me` |
| Trips/stops | `/trips`, `/trips/:id`, `/trips/:tripId/stops`, `/trip-stops/:id` |
| Catalog đã lưu | `/places`, `/provinces`, `/provinces/visited` |
| Review | `/trip-stops/:tripStopId/review` |
| Upload/ảnh | `/uploads/presigned-url`, `/images`, `/images/:id` |

Payload và response chi tiết xem tại Swagger/OpenAPI; endpoint nghiệp vụ yêu cầu
Bearer access token.

### Location Catalog

| Method | Route |
| --- | --- |
| `GET` | `/v1/health` |
| `GET` | `/v1/provinces` |
| `GET` | `/v1/provinces/{provinceCode}/wards` |
| `GET` | `/v1/provinces/{provinceCode}/wards/{wardCode}/places` |
| `GET` | `/v1/provinces/{provinceCode}/places/{placeId}` |

## Kiểm thử và build

```bash
cd front-end
npm test
npm run build
npm run preview
```

Backend có test trong `back-end/tests` nhưng `package.json` hiện chưa khai báo
script `test`; Lambda cũng chưa có automated test. Có thể kiểm tra cú pháp
source Lambda bằng:

```bash
find src -name '*.js' -print0 | xargs -0 -n1 node --check
```

## Triển khai

- Frontend: build `front-end/dist/`, đồng bộ lên S3 và invalidation CloudFront
  nếu distribution còn cache asset cũ.
- Backend: chạy `NODE_ENV=production`; file `.env` chỉ bootstrap cấu hình,
  secret được đọc từ AWS Secrets Manager.
- Database: dùng migration tăng dần; không chạy schema reset hoặc seed trên dữ
  liệu production.
- Location Catalog: build image `linux/amd64`, push ECR, cập nhật Lambda rồi
  smoke test qua API Gateway.

Chi tiết nằm trong README từng module và
[hướng dẫn deploy Lambda](location-catalog-lambda/DEPLOY.md).

## Giới hạn hiện tại

- Chưa có Infrastructure as Code cho toàn bộ tài nguyên AWS.
- Chưa có script tạo/import/sync dữ liệu DynamoDB Location Catalog.
- Lambda chưa có auth, rate limit hoặc test tự động trong source.
- Chưa có module chi phí, chặng di chuyển, chỗ ở, bạn đồng hành hoặc RLS.

## An toàn dữ liệu

- Không commit file env chứa credential hoặc JWT secret.
- Không lưu JWT, presigned URL hay credential trong Web Storage/database.
- `database/nomad-diary.sql` xóa toàn bộ schema ứng dụng.
- `database/nomad-diary-seed.sql` truncate toàn bộ bảng ứng dụng.
- Trước khi chạy migration production, backup/snapshot và dùng
  `ON_ERROR_STOP=1`.

## Tài liệu liên quan

- [Mục lục tài liệu](docs/README.md)
- [Frontend](front-end/README.md)
- [Backend](back-end/README.md)
- [Database](database/README.md)
- [PostgreSQL trên RDS](database/AWS.md)
- [Location Catalog](location-catalog-lambda/README.md)
- [Deploy Location Catalog](location-catalog-lambda/DEPLOY.md)
