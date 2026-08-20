# Nomad Diary Backend API

REST API cho Nomad Diary, xây dựng bằng Node.js, Express 5 và PostgreSQL. Module
chịu trách nhiệm xác thực, giới hạn dữ liệu theo user, nghiệp vụ chuyến đi,
presigned upload và contract OpenAPI.

## Vai trò và phạm vi

- Authentication, profile, đổi mật khẩu và session rotation.
- Trips, trip stops, places, provinces, reviews và images.
- Tạo presigned PUT URL để client upload trực tiếp lên S3.
- Chuyển S3 object key thành URL đọc qua CloudFront.
- Validation bằng Zod, transaction PostgreSQL và lỗi JSON thống nhất.
- Swagger UI/OpenAPI cho contract request/response.

## Kiến trúc

```text
HTTP request
   |
   v
middleware -> routes -> controller -> service -> repository -> PostgreSQL
                           |
                           +-----------------------> S3 presigned URL
```

- `routes`: URL, HTTP method, auth và validation middleware.
- `controller`: chuyển request thành lời gọi service và HTTP response.
- `service`: business rule, quyền sở hữu và transaction.
- `repository`: SQL parameterized.
- `schema`: Zod schema cho params/query/body.

## Cấu trúc thư mục

```text
back-end/
├── src/
│   ├── config/       # Env, Secrets Manager, S3 và constants
│   ├── database/     # Pool, transaction và PostgreSQL errors
│   ├── docs/         # OpenAPI source of truth
│   ├── middleware/   # Auth, CORS-related errors, rate limit, validation
│   ├── modules/
│   │   ├── auth/
│   │   ├── images/
│   │   ├── places/
│   │   ├── provinces/
│   │   ├── reviews/
│   │   ├── trip-stops/
│   │   ├── trips/
│   │   └── uploads/
│   ├── routes/
│   ├── shared/
│   ├── app.js
│   └── server.js
├── tests/
├── .env.development
├── package.json
└── README.md
```

## Yêu cầu

- Node.js 20+.
- npm.
- PostgreSQL 14+.
- `psql` để khởi tạo/migrate database từ terminal.
- AWS credentials hoặc instance role có quyền S3 khi dùng upload.
- AWS Secrets Manager khi chạy production theo cấu hình hiện tại.

## Cài đặt

```bash
cd back-end
npm install
```

### Tạo database local

Từ thư mục gốc repository:

```bash
createdb -U postgres nomad_diary
psql -v ON_ERROR_STOP=1 -U postgres -d nomad_diary -f database/nomad-diary.sql
psql -v ON_ERROR_STOP=1 -U postgres -d nomad_diary -f database/nomad-diary-seed.sql
```

`nomad-diary.sql` xóa schema ứng dụng và seed truncate dữ liệu. Chỉ dùng hai
lệnh này cho local/test. Database có dữ liệu phải dùng
[migration](../database/README.md#migration).

## Cấu hình môi trường

Backend chỉ phân biệt hai mode:

| `NODE_ENV` lúc khởi động | File đọc | Nguồn secret |
| --- | --- | --- |
| `production` | `.env` | AWS Secrets Manager ghi đè nhóm biến bí mật |
| Giá trị khác hoặc không đặt | `.env.development` | File/process local |

`NODE_ENV` phải được truyền cho process trước khi Node chạy. Giá trị bên trong
file env không thể tự chọn chính file đó. File được resolve từ thư mục
`back-end`, không phụ thuộc working directory.

### Development

Tạo `back-end/.env.development`:

```env
NODE_ENV=development
PORT=3000

DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=nomad_diary
DATABASE_USER=postgres
DATABASE_PASSWORD=<local-password>
DATABASE_SSL=false
DATABASE_POOL_MAX=10
DATABASE_IDLE_TIMEOUT_MS=30000
DATABASE_CONNECTION_TIMEOUT_MS=5000

JWT_ACCESS_SECRET=<long-random-secret>
JWT_REFRESH_SECRET=<different-long-random-secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

CORS_ORIGIN=http://localhost:5173

AWS_S3_IMAGE_BUCKET=<private-image-bucket>
AWS_CLOUDFRONT_IMAGE_BASE_URL=https://<distribution-domain>
UPLOAD_MAX_SIZE_MB=10
```

Hai JWT secret phải khác nhau. Tạo mỗi secret bằng:

```bash
node -e "console.log(require('node:crypto').randomBytes(64).toString('hex'))"
```

### Production

`.env` chỉ giữ bootstrap/non-secret:

```env
PORT=3000
DATABASE_PORT=5432
DATABASE_SSL=true
DATABASE_POOL_MAX=10
DATABASE_IDLE_TIMEOUT_MS=30000
DATABASE_CONNECTION_TIMEOUT_MS=5000
UPLOAD_MAX_SIZE_MB=10
```

Source hiện đọc secret `ec2-db-env` tại `ap-southeast-1`. Secret JSON phải có:

```text
DATABASE_HOST
DATABASE_NAME
DATABASE_PASSWORD
DATABASE_USER
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
JWT_ACCESS_EXPIRES_IN
JWT_REFRESH_EXPIRES_IN
CORS_ORIGIN
AWS_CLOUDFRONT_IMAGE_BASE_URL
AWS_S3_IMAGE_BUCKET
```

Instance/task role cần `secretsmanager:GetSecretValue`. Server dừng trước khi
listen nếu thiếu cấu hình, secret không đọc được, hai JWT secret trùng nhau hoặc
secret production ngắn hơn 32 UTF-8 bytes.

## Chạy ứng dụng

```bash
cd back-end
npm run dev
```

Chạy không có file watcher:

```bash
npm start
```

Production:

```bash
NODE_ENV=production npm start
```

API local mặc định ở `http://localhost:3000`. Endpoint được mount trực tiếp
sau domain, không có prefix `/api`.

## Health và OpenAPI

| Method/path | Mục đích |
| --- | --- |
| `GET /` | Tên service |
| `GET /health` | Liveness của Express |
| `GET /health/ready` | Readiness gồm kết nối PostgreSQL |
| `GET /api-docs` | Swagger UI |
| `GET /api-docs.json` | OpenAPI JSON |

Sau khi server chạy, mở `http://localhost:3000/api-docs`. File
`src/docs/openapi.js` là source of truth cho payload, schema và response API.

## Authentication

### Token contract

- Access token được trả trong JSON và gửi bằng
  `Authorization: Bearer <accessToken>`.
- Refresh token chỉ được trả bằng cookie `nomad_diary_refresh_token`.
- Cookie có `HttpOnly`, `SameSite=Strict`, path `/auth`; `Secure` bật khi
  `NODE_ENV=production`.
- Database chỉ lưu SHA-256 hash của refresh token.
- Mỗi refresh revoke session cũ và phát session/token mới.
- Đổi mật khẩu cũng phát session mới; logout và xóa account clear cookie.

`POST /auth/refresh-token` lấy token từ cookie, không nhận
`refreshToken` trong JSON body. Client trình duyệt phải gửi credentials.

### CORS

Backend cho phép request không có Origin, same-host hoặc origin nằm chính xác
trong `CORS_ORIGIN`; response CORS bật credentials. Nhiều origin được phân tách
bằng dấu phẩy, không thêm dấu `/` cuối:

```env
CORS_ORIGIN=https://nomad-diary.site,http://localhost:5173
```

## API

Tất cả endpoint nghiệp vụ dưới đây yêu cầu access token, trừ register, login và
refresh.

| Nhóm | Method/path |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh-token`, `POST /auth/logout` |
| Account | `GET/PATCH /auth/me`, `PATCH /auth/change-password`, `DELETE /auth/account` |
| Trips | `GET/POST /trips`, `GET/PATCH/DELETE /trips/:id` |
| Stops theo trip | `GET/POST /trips/:tripId/stops`, `PATCH /trips/:tripId/stops/reorder` |
| Trip stop | `PATCH/DELETE /trip-stops/:id` |
| Review | `GET/PUT/DELETE /trip-stops/:tripStopId/review` |
| Places | `GET /places` |
| Provinces | `GET /provinces`, `GET /provinces/visited`, `GET /provinces/:id`, `GET /provinces/:id/places` |
| Upload | `POST /uploads/presigned-url` |
| Images | `GET/POST /images`, `GET/PATCH/DELETE /images/:id` |

### Response chuẩn

Thành công:

```json
{
  "success": true,
  "data": {}
}
```

Danh sách có thể thêm `meta` phân trang. Lỗi:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": null
  }
}
```

## Upload và ảnh

1. Client gọi `POST /uploads/presigned-url` với purpose, loại file và size.
2. Backend kiểm tra MIME/size rồi tạo key
   `users/{userId}/{purpose}/{uuid}.{extension}`.
3. Client PUT file trực tiếp lên URL tạm thời.
4. Client lưu object key qua profile/trip/image API.
5. Backend trả URL đọc bằng `AWS_CLOUDFRONT_IMAGE_BASE_URL`.

Bucket nên private. Backend principal cần `s3:PutObject` cho prefix
`users/*`; CloudFront đọc object qua Origin Access Control. Không lưu presigned
URL vào PostgreSQL.

## Database và quyền sở hữu

- Repository luôn dùng query parameterized.
- Endpoint private lấy user ID từ access token, không tin user ID trong body.
- Trip stop create có thể tạo/tái sử dụng province/place trong cùng transaction.
- Catalog place dùng `catalog_place_id`; place nhập thủ công tái sử dụng theo
  tên trong cùng phường/xã.
- Soft-deleted row phải được lọc khỏi truy vấn nghiệp vụ.

Chi tiết constraint, migration và ERD xem
[database/README.md](../database/README.md).

## Kiểm thử và kiểm tra

Package hiện chưa khai báo npm script `test`. Test dùng Node test runner và có
thể chạy trực tiếp:

```bash
cd back-end
node --test
```

Test bao phủ config, schema, middleware/error, repository, helper, image key và
OpenAPI. Các luồng CRUD với PostgreSQL thật vẫn cần test database riêng.

Kiểm tra dependency production:

```bash
npm audit --omit=dev
```

## Vận hành bằng PM2

`package.json` có các script:

```bash
npm run pm2:start
npm run pm2:status
npm run pm2:logs
npm run pm2:restart
npm run pm2:stop
```

`pm2:start` đặt `NODE_ENV=production`. Bảo đảm working directory chứa
`back-end/.env` và instance role đọc được Secrets Manager/S3 trước khi start.

## Xử lý lỗi thường gặp

### Server báo `INVALID_RUNTIME_CONFIGURATION`

Đối chiếu toàn bộ biến bắt buộc, kiểu số dương, `DATABASE_SSL=true|false`, JWT
secret khác nhau và mode được truyền trước khi Node khởi động.

### `CORS_ORIGIN_NOT_ALLOWED`

Thêm đúng origin frontend (scheme + host + port, không có path/dấu slash cuối)
vào `CORS_ORIGIN`, rồi restart server.

### Refresh cookie không được gửi

Kiểm tra HTTPS ở production, exact origin, CORS credentials, cookie path
`/auth`, trình duyệt có lưu cookie và request frontend dùng
`credentials: 'include'`.

### `INVALID_CREDENTIALS`

Dùng email hoặc username ở field `identifier` và password đã đăng ký. Password
hash seed chỉ là dữ liệu minh họa, không dùng để login.

### `INVALID_JSON`

Body JSON dùng dấu nháy kép, không có dấu phẩy thừa và phải khớp schema trong
Swagger.

## Giới hạn hiện tại

- Chưa có npm test script và integration suite dùng PostgreSQL thật.
- Production secret name/region và AWS region đang cố định trong source.
- Chưa có API CRUD độc lập cho tags.
- Chưa có RLS; service/repository chịu trách nhiệm ownership.

## Tài liệu liên quan

- [Tổng quan repository](../README.md)
- [Mục lục tài liệu](../docs/README.md)
- [Database](../database/README.md)
- [Frontend](../front-end/README.md)
