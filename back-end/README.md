# Nomad Diary API

Backend REST API cho ứng dụng nhật ký du lịch Nomad Diary, xây dựng bằng Node.js,
Express 5 và PostgreSQL. API sử dụng JWT access/refresh token và cung cấp
Swagger UI để xem hoặc thử endpoint.

## Công nghệ

- Node.js và Express 5
- PostgreSQL với thư viện `pg`
- Zod để kiểm tra request
- bcrypt để hash mật khẩu
- JWT access token và refresh token
- Swagger/OpenAPI 3.0
- Helmet, CORS và rate limiting

## Yêu cầu môi trường

- Node.js 20 trở lên
- npm
- PostgreSQL 14 trở lên
- Công cụ `psql` nếu muốn chạy schema bằng terminal

## Cài đặt nhanh

Các lệnh dưới đây được chạy từ thư mục `back-end`:

```powershell
cd "D:\Nomad Diary\nomad-diary\back-end"
npm.cmd install
```

Backend chỉ hỗ trợ hai môi trường runtime. `NODE_ENV` phải được truyền vào tiến
trình trước khi Node.js khởi động để chọn file cấu hình:

| `NODE_ENV` | File được đọc | Mục đích |
| --- | --- | --- |
| Không khai báo hoặc `development` | `.env.development` | Chạy local |
| `production` | `.env` | Chạy production |

Giá trị khác như `dev`, `prod`, `test` hoặc `staging` sẽ làm server dừng với lỗi
cấu hình rõ ràng. File được resolve từ thư mục `back-end`, nên kết quả không phụ
thuộc terminal đang đứng ở thư mục nào. Biến đã được cung cấp từ OS, container
hoặc PM2 luôn được ưu tiên hơn giá trị cùng tên trong file.

Trước khi chạy production, tạo `.env` từ `.env.development`, đặt
`NODE_ENV=production` và thay thông tin PostgreSQL, CORS cùng hai JWT secret bằng
giá trị thật. `.env` bị Git bỏ qua; không đưa secret production vào
`.env.development`.

### 1. Tạo database

Tạo database rỗng:

```powershell
psql -U postgres -c "CREATE DATABASE nomad_diary;"
```

Tạo toàn bộ schema, bảng, ràng buộc và index:

```powershell
psql -v ON_ERROR_STOP=1 -U postgres -d nomad_diary -f ..\database\nomad-diary.sql
```

> `nomad-diary.sql` có lệnh `DROP SCHEMA nomad_diary CASCADE`. Không chạy lại
> trên database có dữ liệu cần giữ.

Nạp dữ liệu mẫu cho môi trường development/test (không bắt buộc):

```powershell
psql -v ON_ERROR_STOP=1 -U postgres -d nomad_diary -f ..\database\nomad-diary-seed.sql
```

> Seed sẽ `TRUNCATE` dữ liệu hiện có. Password hash của seed chỉ là dữ liệu
> minh họa và không dùng để đăng nhập. Hãy đăng ký user mới qua API.

### 2. Cấu hình môi trường

```env
NODE_ENV=development
PORT=3000

DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=nomad_diary
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_SSL=false
DATABASE_POOL_MAX=10
DATABASE_IDLE_TIMEOUT_MS=30000
DATABASE_CONNECTION_TIMEOUT_MS=5000

JWT_ACCESS_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-a-different-long-random-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

CORS_ORIGIN=http://localhost:5173,http://localhost:3000

AWS_REGION=ap-southeast-1
AWS_S3_IMAGE_BUCKET=nomad-diary-img
AWS_CLOUDFRONT_IMAGE_BASE_URL=https://example.cloudfront.net
UPLOAD_MAX_SIZE_MB=10
```

`AWS_REGION` và `AWS_S3_IMAGE_BUCKET` là bắt buộc khi dùng upload. IAM
role/user chạy backend cần quyền `s3:PutObject` cho prefix `users/*` trong bucket.
`AWS_CLOUDFRONT_IMAGE_BASE_URL` là domain CloudFront dùng để đọc ảnh. Giữ S3
private và cấp `s3:GetObject` cho CloudFront thông qua Origin Access Control (OAC).

Tạo một secret ngẫu nhiên bằng Node.js:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Chạy lệnh hai lần và sử dụng hai giá trị khác nhau cho
`JWT_ACCESS_SECRET` và `JWT_REFRESH_SECRET`; hai giá trị không được trùng nhau.
Khi `NODE_ENV=production`, mỗi secret phải có ít nhất 32 byte và không được giữ
giá trị `replace-with-...` trong file mẫu. Server kiểm tra cấu hình trước khi bắt
đầu lắng nghe và dừng ngay nếu cấu hình không hợp lệ. Development vẫn nên thay
placeholder để token local không dùng secret công khai.

### 3. Chạy ứng dụng

Development, tự khởi động lại khi code thay đổi:

```powershell
npm.cmd run dev
```

Chạy bình thường:

```powershell
npm.cmd start
```

Mặc định API local chạy tại `http://localhost:3000`. Production dùng base URL
`https://api.nomad-diary.site`; các endpoint được mount trực tiếp sau domain và
không có tiền tố `/api`.

## Kiểm tra hệ thống

| URL | Mục đích |
| --- | --- |
| `GET /` | Thông tin API |
| `GET /health` | Liveness: tiến trình Express đang chạy |
| `GET /health/ready` | Readiness: kiểm tra cả kết nối PostgreSQL |
| `GET /api-docs` | Swagger UI |
| `GET /api-docs.json` | OpenAPI JSON |

Readiness thành công:

```json
{
  "success": true,
  "data": {
    "status": "ready",
    "service": "nomad-diary-api",
    "database": "connected"
  }
}
```

## Swagger

Sau khi server chạy, mở:

```text
http://localhost:3000/api-docs
```

Quy trình thử API có authentication:

1. Gọi `POST /auth/register` để tạo user.
2. Sao chép `accessToken` trong response.
3. Nhấn nút **Authorize** trên Swagger.
4. Nhập access token. Swagger sẽ tự thêm header Bearer.
5. Thử các endpoint trips, provinces, trip stops và reviews.

Nếu Swagger vẫn hiển thị schema cũ, khởi động lại backend và refresh trình
duyệt bằng `Ctrl + F5`.

## Authentication

Các endpoint có biểu tượng ổ khóa yêu cầu header:

```http
Authorization: Bearer <accessToken>
```

Access token có thời hạn ngắn. Refresh token dùng để tạo cặp token mới và được
xoay vòng sau mỗi lần gọi `/auth/refresh-token`. Database chỉ lưu SHA-256
hash của refresh token, không lưu token gốc.

## Chuẩn response

Response thành công:

```json
{
  "success": true,
  "data": {}
}
```

Danh sách có phân trang:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Response lỗi:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data",
    "details": [
      {
        "path": "email",
        "message": "Email must be valid"
      }
    ]
  }
}
```

Các HTTP status thường gặp:

- `200`: thành công
- `201`: tạo dữ liệu thành công
- `204`: thành công và không có response body
- `400`: JSON sai cú pháp
- `401`: thiếu token, token hết hạn hoặc sai thông tin đăng nhập
- `403`: không có quyền hoặc CORS origin không được phép
- `404`: không tìm thấy dữ liệu thuộc user hiện tại
- `409`: trùng email, username, slug hoặc thứ tự điểm dừng
- `422`: request không hợp lệ
- `500`: lỗi hệ thống hoặc cấu hình

## Danh sách API

### Health và tài liệu

| Method | Endpoint | Authentication | Mô tả |
| --- | --- | --- | --- |
| `GET` | `/` | Không | Tên API |
| `GET` | `/health` | Không | Kiểm tra tiến trình API |
| `GET` | `/health/ready` | Không | Kiểm tra API và PostgreSQL |
| `GET` | `/api-docs` | Không | Swagger UI |
| `GET` | `/api-docs.json` | Không | OpenAPI JSON |

### Authentication API

| Method | Endpoint | Authentication | Mô tả |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Không | Đăng ký tài khoản và tạo session |
| `POST` | `/auth/login` | Không | Đăng nhập bằng email hoặc username |
| `POST` | `/auth/refresh-token` | Không | Xoay refresh token và tạo token mới |
| `POST` | `/auth/logout` | Có | Thu hồi session hiện tại |
| `GET` | `/auth/me` | Có | Lấy thông tin user hiện tại |
| `PATCH` | `/auth/me` | Có | Cập nhật profile |
| `PATCH` | `/auth/change-password` | Có | Đổi mật khẩu và thu hồi các session cũ |
| `DELETE` | `/auth/account` | Có | Soft-delete tài khoản |

Đăng ký:

```json
{
  "username": "nomad",
  "email": "nomad@example.com",
  "password": "Password123!",
  "displayName": "Nomad"
}
```

Email và username cùng được dùng làm `identifier` khi đăng nhập. Vì vậy API
không cho đăng ký username trùng email đang hoạt động hoặc email trùng username
đang hoạt động; so sánh không phân biệt chữ hoa/thường.

Response đăng ký/đăng nhập:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "3",
      "username": "nomad",
      "email": "nomad@example.com",
      "displayName": "Nomad",
      "avatarUrl": null,
      "avatarObjectKey": null,
      "bio": null,
      "createdAt": "2026-08-02T02:41:16.000Z",
      "updatedAt": "2026-08-02T02:41:16.000Z"
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "tokenType": "Bearer",
    "accessTokenExpiresIn": "15m",
    "refreshTokenExpiresIn": "30d"
  }
}
```

Đăng nhập. `identifier` nhận email hoặc username:

```json
{
  "identifier": "nomad@example.com",
  "password": "Password123!"
}
```

Refresh token:

```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

Cập nhật profile:

```json
{
  "displayName": "Nomad Diary",
  "avatarObjectKey": "users/3/avatar/2bb95131-6918-4d70-813a-33f916edb781.jpg",
  "bio": "Ghi lại những nơi tôi đã đi qua."
}
```

Đổi mật khẩu:

```json
{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword123!"
}
```

Xóa tài khoản:

```json
{
  "password": "NewPassword123!"
}
```

### Trips API

Mọi endpoint trips đều yêu cầu access token và chỉ truy cập chuyến đi thuộc
user hiện tại.

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| `GET` | `/trips` | Danh sách chuyến đi có lọc và phân trang |
| `POST` | `/trips` | Tạo chuyến đi |
| `GET` | `/trips/:id` | Chi tiết chuyến đi |
| `PATCH` | `/trips/:id` | Cập nhật một phần chuyến đi |
| `DELETE` | `/trips/:id` | Soft-delete chuyến đi |

Query của `GET /trips`:

| Query | Kiểu | Mặc định | Mô tả |
| --- | --- | --- | --- |
| `page` | integer | `1` | Trang hiện tại |
| `pageSize` | integer | `20` | Số bản ghi, tối đa `100` |
| `status` | integer | — | Trạng thái từ `0` đến `4` |
| `year` | integer | — | Lọc theo năm của `startDate` |
| `search` | string | — | Tìm trong title và description |
| `sort` | string | `createdAtDesc` | Kiểu sắp xếp |

Giá trị `sort` hợp lệ:

```text
createdAtDesc
createdAtAsc
startDateDesc
startDateAsc
titleAsc
titleDesc
```

Ví dụ:

```text
GET /trips?page=1&pageSize=10&status=1&year=2026&sort=startDateAsc
```

Trạng thái chuyến đi:

```text
0 = draft
1 = planned
2 = ongoing
3 = completed
4 = cancelled
```

Tạo chuyến đi:

```json
{
  "title": "Đà Lạt 2026",
  "slug": "da-lat-2026",
  "description": "Chuyến đi 4 ngày 3 đêm",
  "thumbnailObjectKey": "users/3/trip-cover/2bb95131-6918-4d70-813a-33f916edb781.jpg",
  "status": 1,
  "startDate": "2026-08-20",
  "endDate": "2026-08-24",
  "isPublic": false
}
```

Chỉ `title` và `slug` là bắt buộc. `slug` chỉ gồm chữ thường, số và dấu gạch
ngang, ví dụ `da-lat-2026`.

Cập nhật chuyến đi:

```json
{
  "title": "Đà Lạt tháng 8/2026",
  "status": 3,
  "isPublic": true
}
```

Response chuyến đi:

```json
{
  "success": true,
  "data": {
    "id": "7",
    "title": "Đà Lạt 2026",
    "slug": "da-lat-2026",
    "description": "Chuyến đi 4 ngày 3 đêm",
    "thumbnailUrl": "https://nomad-diary-images.s3...presigned...",
    "thumbnailObjectKey": "users/3/trip-cover/2bb95131-6918-4d70-813a-33f916edb781.jpg",
    "status": 1,
    "startDate": "2026-08-20",
    "endDate": "2026-08-24",
    "isPublic": false,
    "stopCount": 0,
    "createdAt": "2026-08-02T10:00:00.000Z",
    "updatedAt": "2026-08-02T10:00:00.000Z"
  }
}
```

### Uploads API

`POST /uploads/presigned-url` yêu cầu access token và trả về presigned PUT URL
có hiệu lực đúng 5 phút. API chỉ nhận JPEG, PNG, WebP hoặc AVIF; dung lượng tối đa
lấy từ `UPLOAD_MAX_SIZE_MB`.

Request:

```json
{
  "fileName": "da-lat.jpg",
  "contentType": "image/jpeg",
  "fileSize": 2048000,
  "purpose": "trip-cover"
}
```

`purpose` nhận `avatar`, `trip-cover` hoặc `images`; mặc định là `images`.

Profile nhận `avatarObjectKey`; trip create/update nhận `thumbnailObjectKey`. Backend
lưu object key ổn định vào `users.avatar_key` hoặc `trips.thumbnail_key`, đồng thời trả object key và một
URL CloudFront được ghép từ object key khi đọc user/trip. Object key phải thuộc đúng user đăng nhập và
đúng purpose (`avatar` hoặc `trip-cover`).

Response:

```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://nomad-diary-images.s3...",
    "objectKey": "users/3/trip-cover/uuid.jpg",
    "expiresIn": 300,
    "method": "PUT",
    "headers": {
      "Content-Type": "image/jpeg"
    }
  }
}
```

Frontend phải PUT file gốc vào `uploadUrl`, gửi `Content-Type` đúng như response.
Bucket S3 phải cho phép CORS `PUT` từ origin của frontend. Lưu `objectKey`
thay vì URL CloudFront. Khi đọc dữ liệu, backend trả URL ổn định dạng
`${AWS_CLOUDFRONT_IMAGE_BASE_URL}/${objectKey}`. Không còn presigned GET URL;
presigned URL chỉ được dùng cho thao tác PUT upload.

### Images API

Module images lưu metadata của ảnh đã upload vào bảng `images`. `image_key` là bắt
buộc; `thumbnail_key` có thể để `NULL`. Cả hai key phải thuộc user đăng nhập và có
purpose `images`.

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| `GET` | `/images` | Danh sách ảnh có phân trang và bộ lọc |
| `POST` | `/images` | Lưu metadata cho object đã upload |
| `GET` | `/images/:id` | Đọc một ảnh thuộc user hiện tại |
| `PATCH` | `/images/:id` | Cập nhật metadata hoặc object key |
| `DELETE` | `/images/:id` | Soft-delete bản ghi ảnh; không xóa object S3 |

Ví dụ tạo image sau khi PUT file thành công lên presigned URL:

```json
{
  "tripId": "7",
  "tripStopId": "12",
  "imageObjectKey": "users/3/images/2bb95131-6918-4d70-813a-33f916edb781.jpg",
  "thumbnailObjectKey": null,
  "originalFilename": "da-lat.jpg",
  "capturedAt": "2026-08-20T08:30:00+07:00",
  "mimeType": "image/jpeg",
  "fileSize": 2048000,
  "isCover": false,
  "isFavorite": true
}
```

`GET /images` hỗ trợ `tripId`, `tripStopId`, `placeId`, `provinceId`, `favorite`,
`cover`, `from`, `to`, `sort`, `page` và `pageSize`. Mỗi response ảnh trả cả
`imageObjectKey`/`thumbnailObjectKey` được lưu trong database và
`imageUrl`/`thumbnailUrl` qua CloudFront. Tất cả truy vấn đều lọc theo trip thuộc user đang đăng nhập và
bỏ qua record đã soft-delete.

### Provinces API

Các endpoint tỉnh yêu cầu access token vì thống kê được tính riêng cho user hiện tại.
Một tỉnh được xem là đã ghé khi user có ít nhất một `trip_stop` đang hoạt động, thuộc
một trip đang hoạt động và một place đang hoạt động trong tỉnh đó.

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| `GET` | `/provinces` | Danh sách tỉnh kèm thống kê tracking và phân trang |
| `GET` | `/provinces/visited` | Danh sách tỉnh đã ghé để tô bản đồ |
| `GET` | `/provinces/:id` | Chi tiết tỉnh kèm thống kê của user |
| `GET` | `/provinces/:id/places` | Danh sách địa điểm trong tỉnh kèm lịch sử ghé |

Query của `GET /provinces`:

| Query | Kiểu | Mặc định | Mô tả |
| --- | --- | --- | --- |
| `page` | integer | `1` | Trang hiện tại |
| `pageSize` | integer | `20` | Số bản ghi, tối đa `100` |
| `countryCode` | string | — | Mã quốc gia hai ký tự, ví dụ `VN` |
| `search` | string | — | Tìm theo tên hoặc mã tỉnh |
| `visited` | boolean | — | `true`: đã ghé, `false`: chưa ghé |

`GET /provinces/visited` không phân trang để frontend có thể lấy toàn bộ mã tỉnh
đã ghé trong một request và nối `province.code` với `feature.properties.code` của GeoJSON.
Có thể lọc theo `countryCode`.

Ví dụ lấy các địa điểm đã ghé tại một tỉnh:

```text
GET /provinces/1/places?visited=true&page=1&pageSize=20
```

Query của endpoint địa điểm gồm `page`, `pageSize`, `search` và `visited=true|false`.
Nếu không truyền `visited`, API trả cả địa điểm đã ghé và chưa ghé trong tỉnh.

Response tracking tỉnh:

```json
{
  "success": true,
  "data": {
    "id": "1",
    "countryCode": "VN",
    "code": "68",
    "name": "Lâm Đồng",
    "slug": "lam-dong",
    "centerLatitude": 11.5753,
    "centerLongitude": 108.1429,
    "visited": true,
    "tripCount": 3,
    "placeCount": 8,
    "visitCount": 12,
    "firstVisitedAt": "2025-01-10T01:00:00.000Z",
    "lastVisitedAt": "2026-03-11T00:00:00.000Z"
  }
}
```

`placeCount` là số địa điểm duy nhất (`COUNT(DISTINCT place_id)`), còn `visitCount`
là tổng số lần ghé (`COUNT(trip_stops.id)`). Ghé lại cùng một place làm tăng
`visitCount` nhưng không làm tăng `placeCount`. Các thời điểm có thể là `null` nếu
trip stop không có `arrivedAt`.

Response địa điểm trong tỉnh bổ sung các trường tracking:

```json
{
  "id": "10",
  "provinceId": "1",
  "name": "Hồ Xuân Hương",
  "visited": true,
  "tripCount": 2,
  "visitCount": 3,
  "firstVisitedAt": "2025-01-10T01:00:00.000Z",
  "lastVisitedAt": "2026-03-11T00:00:00.000Z"
}
```

### Trip Stops API

`placeId` tham chiếu một địa điểm đã tồn tại trong bảng `places`. Một trip có
thể ghé cùng một place nhiều lần, nhưng `visitOrder` đang hoạt động phải duy
nhất trong trip.

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| `GET` | `/trips/:tripId/stops` | Danh sách điểm dừng của trip |
| `POST` | `/trips/:tripId/stops` | Thêm điểm dừng |
| `PATCH` | `/trips/:tripId/stops/reorder` | Sắp xếp lại toàn bộ điểm dừng |
| `PATCH` | `/trip-stops/:id` | Cập nhật điểm dừng |
| `DELETE` | `/trip-stops/:id` | Soft-delete điểm dừng |

Tạo điểm dừng:

```json
{
  "placeId": "1",
  "visitOrder": 1,
  "arrivedAt": "2026-08-20T08:00:00+07:00",
  "departedAt": "2026-08-20T10:30:00+07:00",
  "title": "Buổi sáng ở hồ",
  "note": "Nên đến trước 7 giờ"
}
```

Nếu không truyền `visitOrder`, API tự thêm điểm dừng vào cuối danh sách.
Timestamp phải là ISO-8601 có timezone như `Z` hoặc `+07:00`.

Cập nhật điểm dừng:

```json
{
  "title": "Ngắm bình minh ở hồ",
  "note": "Mang theo áo khoác"
}
```

Sắp xếp lại điểm dừng:

```json
{
  "stops": [
    {
      "id": "12",
      "visitOrder": 1
    },
    {
      "id": "15",
      "visitOrder": 2
    }
  ]
}
```

Request reorder phải chứa tất cả điểm dừng đang hoạt động của trip và thứ tự
phải liên tục từ `1`. Toàn bộ thao tác chạy trong một database transaction.

Response điểm dừng:

```json
{
  "success": true,
  "data": {
    "id": "12",
    "tripId": "7",
    "placeId": "1",
    "visitOrder": 1,
    "arrivedAt": "2026-08-20T01:00:00.000Z",
    "departedAt": "2026-08-20T03:30:00.000Z",
    "title": "Buổi sáng ở hồ",
    "note": "Nên đến trước 7 giờ",
    "place": {
      "id": "1",
      "name": "Hồ Xuân Hương",
      "slug": "ho-xuan-huong",
      "provinceId": "1",
      "provinceName": "Lâm Đồng",
      "provinceCode": "68"
    },
    "createdAt": "2026-08-02T10:00:00.000Z",
    "updatedAt": "2026-08-02T10:00:00.000Z"
  }
}
```

### Reviews API

Review thuộc một lần ghé cụ thể (`trip_stop`), không thuộc trực tiếp `place`.
Mỗi trip stop chỉ có tối đa một review đang hoạt động.

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| `GET` | `/trip-stops/:tripStopId/review` | Lấy review |
| `PUT` | `/trip-stops/:tripStopId/review` | Tạo mới hoặc thay thế review |
| `DELETE` | `/trip-stops/:tripStopId/review` | Soft-delete review |

Tạo hoặc cập nhật review:

```json
{
  "rating": 5,
  "revisitStatus": 1,
  "isFavorite": true,
  "note": "Rất đáng quay lại",
  "warningNote": null
}
```

Quy ước:

- `rating`: `null` hoặc số nguyên từ `1` đến `5`
- `revisitStatus`: `0` chưa đánh giá, `1` nên quay lại, `2` cân nhắc,
  `3` không nên quay lại
- `isFavorite`: địa điểm yêu thích trong lần ghé này

Response review:

```json
{
  "success": true,
  "data": {
    "id": "5",
    "tripStopId": "12",
    "rating": 5,
    "revisitStatus": 1,
    "isFavorite": true,
    "note": "Rất đáng quay lại",
    "warningNote": null,
    "createdAt": "2026-08-02T10:00:00.000Z",
    "updatedAt": "2026-08-02T10:00:00.000Z"
  }
}
```

## Phạm vi API hiện tại

Backend hiện đã mount và kiểm thử các module:

- Authentication
- Trips
- Provinces và province tracking
- Trip stops và reorder
- Place reviews

Database đã có các bảng `places`, `images`, `tags`, `trip_tags` và `place_tags`, nhưng
API CRUD riêng cho các bảng này chưa được triển khai. Module provinces hiện chỉ đọc
catalog tỉnh/place và thống kê lượt ghé; dữ liệu `places` vẫn cần được tạo bằng
schema/seed hoặc quản lý trực tiếp trong database trước khi thêm trip stop.

## Cấu trúc mã nguồn

```text
back-end/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   │   └── env.js
│   ├── database/
│   │   ├── pool.js
│   │   ├── postgres-errors.js
│   │   └── transaction.js
│   ├── docs/
│   │   └── openapi.js
│   ├── middleware/
│   ├── modules/
│   │   ├── auth/
│   │   ├── provinces/
│   │   ├── trips/
│   │   ├── trip-stops/
│   │   └── reviews/
│   ├── routes/
│   └── shared/
│       ├── constants/
│       ├── errors/
│       ├── http/
│       ├── pagination/
│       └── validation/
├── tests/
├── .env.development
├── package.json
└── README.md
```

Mỗi module được chia theo các lớp:

```text
routes → controller → service → repository → PostgreSQL
```

- `routes`: khai báo URL, HTTP method và middleware
- `controller`: đọc request và trả response
- `service`: xử lý business rule và transaction
- `repository`: chứa câu SQL parameterized
- `schema`: kiểm tra và chuẩn hóa dữ liệu bằng Zod

Các giá trị dùng chung như trạng thái trip, trạng thái review, kiểu sort và
loại JWT được khai báo trong `src/shared/constants/domain.js`. Validator ID và
auth context dùng chung nằm trong `src/shared/validation` và `src/shared/http`.
Mã lỗi và thông điệp chuẩn được khai báo trong
`src/shared/constants/errors.js`. Khi thêm nghiệp vụ mới, sử dụng các helper và
catalog này thay vì viết lại logic trong từng module.

## Chạy test

```powershell
npm.cmd test
```

Test hiện kiểm tra health, Swagger, JSON error, CORS, login schema, cấu hình JWT,
strict timestamp, ownership SQL của review, province tracking theo user, database
executor, shared helpers và validation tương thích Express 5. Các luồng CRUD sử dụng
PostgreSQL thật vẫn cần
một test database riêng và sẽ được bổ sung cùng integration test ở bước tiếp
theo.

Kiểm tra dependency production:

```powershell
npm.cmd audit --omit=dev
```

## Xử lý lỗi thường gặp

### `Failed to load the ES module`

Đảm bảo [package.json](package.json) có:

```json
{
  "type": "module"
}
```

Sau đó chạy server qua npm:

```powershell
npm.cmd run dev
```

### Cấu hình local hoặc production không được nhận

Khi chạy local, không khai báo `NODE_ENV` hoặc đặt chính xác
`NODE_ENV=development`; server sẽ đọc `.env.development`. Khi chạy production, tạo
file `.env` và đặt `NODE_ENV=production` trước khi khởi động server:

```powershell
Copy-Item .env.development .env
$env:NODE_ENV = "production"
npm.cmd start
```

Không dùng tên rút gọn `dev` hoặc `prod`. `NODE_ENV` trong file không thể tự chọn
chính file đó; giá trị từ tiến trình khởi động mới là giá trị quyết định. Sau khi
sửa cấu hình, phải khởi động lại server.

### `CORS_ORIGIN_NOT_ALLOWED`

Thêm URL frontend vào `CORS_ORIGIN`, phân tách nhiều URL bằng dấu phẩy:

```env
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

Không thêm dấu `/` ở cuối origin và khởi động lại server sau khi thay đổi.

### `INVALID_CREDENTIALS`

- Dùng đúng password đã gửi lúc đăng ký.
- `identifier` phải là email hoặc username.
- Không gửi giá trị mặc định `"string"` của Swagger.
- Password hash bcrypt không thể giải mã ngược; nếu quên mật khẩu cần có luồng
  reset password hoặc tạo tài khoản development mới.

Request đăng nhập đúng:

```json
{
  "identifier": "nomad@example.com",
  "password": "Password123!"
}
```

### `INVALID_JSON`

JSON bắt buộc dùng dấu nháy kép, không có dấu phẩy thừa:

```json
{
  "identifier": "nomad@example.com",
  "password": "Password123!"
}
```
