# Nomad Diary Frontend

Ứng dụng web Vue 3 cho Nomad Diary. Module quản lý giao diện, trạng thái phía
client, auth session trong memory, upload ảnh và kết nối đồng thời tới Backend
API cùng Location Catalog API.

## Vai trò và phạm vi

- Đăng ký, đăng nhập, hồ sơ và đổi mật khẩu.
- Danh sách, tạo, sửa và xem chi tiết chuyến đi.
- Quản lý trip stop từ catalog hoặc địa điểm nhập thủ công.
- Quản lý ảnh, EXIF, tiến độ upload và review.
- Hiển thị thống kê tỉnh/thành đã ghé.
- Khôi phục phiên bằng refresh cookie và đồng bộ session giữa các tab.

Frontend không lưu refresh token, không truy cập database và không chứa AWS/JWT
secret.

## Luồng kết nối

```text
Vue views
   |
   +--> Pinia stores --> src/api --> src/services/api.js --> Backend API
   |                                                |
   |                                                +--> cookie credentials
   |
   +--> locationCatalogApi -----------------------------> Catalog API
   |
   +--> useImageUpload --> presigned URL ----------------> Amazon S3
```

## Cấu trúc thư mục

```text
front-end/
├── src/
│   ├── api/          # Hàm gọi API theo domain
│   ├── components/   # Component dùng lại
│   ├── composables/  # Logic composition dùng lại
│   ├── constants/    # Route, domain enum và client constants
│   ├── router/       # Route table và navigation guards
│   ├── schemas/      # Zod validation phía client
│   ├── services/     # HTTP client và auth session/tab sync
│   ├── stores/       # Pinia stores
│   ├── utils/        # Date, number, string, error, places và EXIF
│   ├── views/        # Route-level pages
│   ├── workers/      # Web Worker đọc metadata ảnh
│   ├── App.vue
│   └── main.js
├── tests/
├── .env.development
├── package.json
└── vite.config.js
```

## Yêu cầu

- Node.js 20.19+ hoặc 22.12+.
- npm.
- Backend API đang chạy nếu kiểm thử luồng nghiệp vụ local.
- Trình duyệt hỗ trợ ES modules; `BroadcastChannel` giúp đồng bộ tab nhưng
  frontend vẫn có fallback khôi phục bằng refresh cookie.

## Cài đặt

Từ thư mục gốc repository:

```bash
cd front-end
npm install
```

## Cấu hình môi trường

Vite đọc `.env.development` khi chạy `npm run dev` và test. Production có thể
dùng `.env.production` hoặc biến môi trường của hệ thống build:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_LOCATION_CATALOG_BASE_URL=https://locations-api.nomad-diary.site
VITE_SWAGGER_URL=http://localhost:3000/api-docs
```

| Biến | Mục đích | Giá trị mặc định trong source |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Backend REST API | Local: `http://localhost:3000`; production: `https://api.nomad-diary.site` |
| `VITE_LOCATION_CATALOG_BASE_URL` | Location Catalog public API | `https://locations-api.nomad-diary.site` |
| `VITE_SWAGGER_URL` | Còn trong file env nhưng source hiện chưa đọc | Không có consumer |

Không thêm password, JWT secret, AWS credential hoặc secret bất kỳ vào biến
`VITE_*`; Vite đưa chúng vào JavaScript bundle công khai.

## Chạy local

Khởi động backend trước, sau đó:

```bash
cd front-end
npm run dev
```

Vite in URL truy cập ra terminal, thường là `http://localhost:5173`. Backend
không có prefix `/api`; ví dụ endpoint login là `/auth/login`.

## Authentication và session

### Nơi lưu token

- Refresh token chỉ nằm trong cookie do backend đặt: `HttpOnly`,
  `SameSite=Strict`, và `Secure` ở production.
- Access token và thông tin user chỉ nằm trong Pinia/memory.
- Store chủ động xóa key legacy `nomad-diary.auth-session` khỏi
  `localStorage` và `sessionStorage`.

### Khởi tạo và refresh

Khi ứng dụng khởi động:

1. Auth store xóa session legacy và access token cũ trong memory.
2. Tab mới thử xin snapshot từ tab đang đăng nhập cùng origin.
3. Nếu chưa có session, frontend gọi `POST /auth/refresh-token` kèm cookie.
4. Khi private request trả `401`, client refresh một lần rồi retry request.
5. Các tab/request đồng thời dùng shared lock để tránh rotate cùng refresh token
   nhiều lần.
6. Nếu refresh thất bại, private state được xóa và router chuyển về login.

Mọi request backend dùng `credentials: 'include'`. Vì vậy production cần:

- frontend/backend chạy qua HTTPS;
- backend cho phép đúng frontend origin;
- CORS bật credentials;
- cookie domain/path phù hợp. Cookie hiện dùng path `/auth`.

## API client

Các module tại `src/api/`:

| File | Phạm vi |
| --- | --- |
| `auth.js` | Register, login, refresh, logout, profile và account |
| `health.js` | Liveness và readiness |
| `images.js` | CRUD metadata ảnh |
| `location-catalog.js` | Tỉnh, phường/xã và địa điểm từ Lambda |
| `places.js` | Địa điểm đã lưu trong PostgreSQL |
| `provinces.js` | Tỉnh đã lưu và thống kê đã ghé |
| `reviews.js` | Get, upsert và delete review |
| `trip-stops.js` | List, CRUD và reorder stop |
| `trips.js` | List và CRUD trip |
| `uploads.js` | Presigned URL và upload trực tiếp lên S3 |

`src/services/api.js` chuẩn hóa query, Bearer token, cookie credentials, lỗi
`ApiError`, refresh-on-`401` và retry. Location Catalog có base URL riêng và
không gửi auth token.

## Pinia stores

| Store | Trách nhiệm |
| --- | --- |
| `useAuthStore` | User, access token, initialize, login, refresh, logout và profile |
| `useTripsStore` | Danh sách, phân trang, current trip và CRUD |
| `useTripStopsStore` | Điểm dừng theo trip, CRUD và reorder |
| `useReviewsStore` | Review theo trip stop |
| `useImagesStore` | Danh sách và metadata ảnh |
| `useProvincesStore` | Tỉnh, địa điểm và thống kê đã ghé |

Auth store xóa toàn bộ private store khi logout, đổi user hoặc session không còn
hợp lệ.

## Routes

| Path | Name | Truy cập |
| --- | --- | --- |
| `/` | `home` | Công khai |
| `/login` | `login` | Guest only |
| `/register` | `register` | Guest only |
| `/trips` | `trips` | Đã đăng nhập |
| `/trips/new` | `trip-create` | Đã đăng nhập |
| `/trips/:id` | `trip-detail` | Đã đăng nhập |
| `/trips/:id/images` | `trip-images` | Đã đăng nhập |
| `/trips/:id/edit` | `trip-edit` | Đã đăng nhập |
| `/trip-stops/:tripStopId/review` | `trip-stop-review` | Đã đăng nhập |
| `/provinces` | `provinces` | Đã đăng nhập |
| `/provinces/:id` | `province-detail` | Đã đăng nhập |
| `/profile` | `profile` | Đã đăng nhập |
| `/profile/change-password` | `change-password` | Đã đăng nhập |
| `/:pathMatch(.*)*` | `not-found` | Công khai |

Route `requiresAuth` chờ auth initialize rồi redirect về
`/login?redirect=...` nếu không khôi phục được session. Route `guestOnly`
đưa user đã đăng nhập về danh sách trips.

## Validation, địa điểm và ảnh

- Zod schema trong `src/schemas/` báo lỗi form trước khi gửi request; backend
  vẫn là lớp validation cuối cùng.
- `src/utils/places.js` hợp nhất kết quả Location Catalog và địa điểm đã lưu,
  ưu tiên bản ghi PostgreSQL có cùng `catalogPlaceId`.
- `exifr` và Web Worker đọc ngày chụp, GPS, kích thước ảnh theo từng file.
- Chỉ ảnh thiếu ngày chụp mới yêu cầu nhập ngày thủ công; người dùng có thể bỏ
  GPS trước khi lưu.
- Presigned URL chỉ dùng để PUT file lên S3, không được lưu vào database.

## Kiểm thử

```bash
cd front-end
npm test
```

Vitest hiện bao phủ API helper, auth recovery/tab sync, constants, router, Zod
schema, Pinia stores, EXIF và utilities. Test chạy một lần bằng mode
`development`.

## Build và triển khai

```bash
cd front-end
npm run build
npm run preview
```

Output production nằm trong `front-end/dist/`. Khi deploy static site lên S3:

```bash
aws s3 sync dist/ s3://<frontend-bucket> --delete
aws cloudfront create-invalidation --distribution-id <distribution-id> --paths '/*'
```

`--delete` xóa asset cũ khỏi prefix đích, vì vậy phải kiểm tra đúng bucket trước
khi chạy. CloudFront invalidation giúp HTML/source mới không bị cache cũ. Với
Vue history mode, S3/CloudFront cần fallback route về `index.html`.

## Xử lý lỗi thường gặp

### Reload hoặc tab mới bị yêu cầu đăng nhập

Kiểm tra request `POST /auth/refresh-token` trong Network:

- request có cookie `nomad_diary_refresh_token`;
- frontend và backend đều HTTPS ở production;
- response CORS cho đúng origin và credentials;
- cookie không bị chặn bởi domain/path/SameSite;
- frontend đang chạy đúng bundle mới sau CloudFront invalidation.

### `BroadcastChannel ... could not be cloned`

Chỉ publish plain object có thể structured-clone. Không truyền Pinia proxy,
`ref`, function, Error hoặc Promise. Session publisher hiện lấy snapshot gồm
plain user/token fields trước khi gửi.

### UI vẫn dùng source cũ sau deploy

Kiểm tra file trong `dist/`, đồng bộ đúng S3 bucket, invalidation CloudFront và
hard reload trình duyệt. Không sửa trực tiếp file trong `dist/`; luôn build lại
từ source.

## Tài liệu liên quan

- [Tổng quan repository](../README.md)
- [Mục lục tài liệu](../docs/README.md)
- [Backend API](../back-end/README.md)
- [Location Catalog](../location-catalog-lambda/README.md)
