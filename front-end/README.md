# Nomad Diary Frontend

Frontend Vue 3 được khởi tạo bằng Vite và kết nối tới Nomad Diary API.

## Yêu cầu

- Node.js 20.19+ hoặc 22.12+
- Backend chạy tại `http://localhost:3000`

## Cài đặt

```powershell
cd "D:\Nomad Diary\nomad-diary\front-end"
npm.cmd install
```

## Chạy development

Khởi động backend trước:

```powershell
cd "D:\Nomad Diary\nomad-diary\back-end"
npm.cmd run dev
```

Mở terminal khác và khởi động frontend:

```powershell
cd "D:\Nomad Diary\nomad-diary\front-end"
npm.cmd run dev
```

Truy cập `http://127.0.0.1:5173`.

Trong development, frontend gọi trực tiếp backend tại `http://localhost:3000`.
Ví dụ endpoint đăng nhập là `http://localhost:3000/auth/login`; backend không dùng
tiền tố `/api`.

## Environment variables

Frontend dùng file môi trường theo mode chuẩn của Vite:

- `development` đọc `.env.development` để gọi backend local. Test cũng chạy
  bằng mode này.
- `production` đọc `.env` để gọi backend đã deploy.

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SWAGGER_URL=http://localhost:3000/api-docs
```

- `VITE_API_BASE_URL`: base URL được API client sử dụng.
- `VITE_SWAGGER_URL`: đường dẫn Swagger hiển thị trên trang khởi động.

Production mặc định gọi `https://api.nomad-diary.site`. Có thể ghi đè giá trị
này bằng `VITE_API_BASE_URL` trong hệ thống build/deploy.

Biến bắt đầu bằng `VITE_` được đưa vào frontend bundle, vì vậy không đặt mật
khẩu, JWT secret hoặc thông tin bí mật trong các biến này.

## API client

HTTP client dùng chung nằm tại `src/services/api.js`. Các hàm nghiệp vụ được
chia theo module trong `src/api/`:

| File | Chức năng |
| --- | --- |
| `api/auth.js` | Register, login, refresh, logout, profile và account |
| `api/health.js` | Liveness và database readiness |
| `api/images.js` | List, detail, create, update và delete ảnh hành trình |
| `api/provinces.js` | List, visited list, detail và places theo tỉnh |
| `api/trips.js` | List, detail, create, update và delete trip |
| `api/trip-stops.js` | List, create, update, delete và reorder stop |
| `api/reviews.js` | Get, upsert và delete review |

Upload ảnh được xử lý trong `api/uploads.js`: xin presigned URL và PUT file trực tiếp
lên S3 bằng Axios để nhận tiến độ tải theo phần trăm. Form hồ sơ và form chuyến đi dùng file picker
cho avatar/ảnh bìa. Database nhận `avatarObjectKey` hoặc `thumbnailObjectKey`;
presigned URL tạm thời không được lưu.

Màn quản lý ảnh hành trình đọc EXIF riêng cho từng file bằng `exifr`: tự lấy thời
gian chụp, GPS và kích thước. Chỉ ảnh không có ngày chụp mới yêu cầu người dùng
chọn ngày thủ công; GPS có thể được bỏ trước khi lưu metadata qua `POST /images`.

Ví dụ gọi trực tiếp API module:

```js
import { authApi, tripsApi } from '@/api/index.js'
import { setAccessToken } from '@/services/api.js'

const result = await authApi.login({
  identifier: 'nomad@example.com',
  password: 'Password123!',
})

setAccessToken(result.data.accessToken)

const trips = await tripsApi.list({
  page: 1,
  pageSize: 20,
  status: 3,
})
```

HTTP client tự thêm Bearer token sau khi gọi `setAccessToken`. Lỗi backend được
chuyển thành `ApiError` với `code`, `message`, `details` và `status`.

## Pinia stores

Pinia được đăng ký trong `src/main.js`. Các store toàn cục nằm trong
`src/stores/`:

| Store | State và actions chính |
| --- | --- |
| `useAuthStore` | User, token, register, login, refresh, logout và profile |
| `useTripsStore` | Danh sách, phân trang, trip hiện tại và CRUD |
| `useTripStopsStore` | Điểm dừng theo trip, CRUD và reorder |
| `useReviewsStore` | Review theo trip stop, get, save và delete |

Ví dụ trong Vue component:

```vue
<script setup>
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTripsStore } from '@/stores/trips.js'

const tripsStore = useTripsStore()
const { items, meta, loading, error } = storeToRefs(tripsStore)

onMounted(() => {
  tripsStore.fetchTrips({ page: 1, pageSize: 20, status: 3 })
})
</script>
```

Auth store chỉ giữ user và access token trong bộ nhớ; không ghi dữ liệu xác thực vào
Web Storage. Refresh token nằm trong cookie `HttpOnly`, `Secure`, `SameSite=Strict`
do backend quản lý. Khi reload hoặc mở lại trình duyệt, frontend khôi phục phiên bằng
cookie và đồng bộ các tab cùng origin qua `BroadcastChannel`. Khi private request trả về `401`, HTTP
client gọi refresh token một lần, cập nhật session rồi retry request ban đầu.
Các request `401` đồng thời dùng chung một refresh promise để tránh xoay token
nhiều lần. Nếu refresh thất bại, session được xóa và router chuyển về trang
đăng nhập. Không lưu JWT secret trong frontend.

## Vue Router

Router được khai báo trong `src/router/` và đăng ký tại `src/main.js`:

| Route | Name | Quyền truy cập |
| --- | --- | --- |
| `/` | `home` | Công khai |
| `/login` | `login` | Chỉ khi chưa đăng nhập |
| `/register` | `register` | Chỉ khi chưa đăng nhập |
| `/trips` | `trips` | Đã đăng nhập |
| `/trips/new` | `trip-create` | Đã đăng nhập |
| `/trips/:id` | `trip-detail` | Đã đăng nhập |
| `/trips/:id/edit` | `trip-edit` | Đã đăng nhập |
| `/trip-stops/:tripStopId/review` | `trip-stop-review` | Đã đăng nhập |
| `/profile` | `profile` | Đã đăng nhập |
| `/profile/change-password` | `change-password` | Đã đăng nhập |
| `/:pathMatch(.*)*` | `not-found` | Công khai |

Route có `meta.requiresAuth` tự chuyển về `/login?redirect=...` nếu chưa có
session. Route có `meta.guestOnly` tự chuyển về danh sách trips nếu user đã
đăng nhập.

## Shared constants

Các hằng số dùng chung nằm trong `src/constants/`:

| File | Nội dung |
| --- | --- |
| `constants/app.js` | Storage key, Bearer scheme, pagination và client error code |
| `constants/domain.js` | Trip status, revisit status, danh sách value và option/label tương ứng |
| `constants/routes.js` | Tên và path của toàn bộ Vue Router routes |
| `constants/index.js` | Export tập trung các constants |

Ví dụ:

```js
import {
  ROUTE_NAME,
  TRIP_STATUS,
  TRIP_STATUS_OPTIONS,
} from '@/constants/index.js'

router.push({ name: ROUTE_NAME.TRIPS })

const filters = {
  status: TRIP_STATUS.COMPLETED,
}
```

Các object và option list đều dùng `Object.freeze()` để tránh bị thay đổi trong
runtime.

## Utils, validation và composables

Frontend dùng Zod để kiểm tra và chuẩn hóa dữ liệu trước khi gọi API. Backend
vẫn là lớp validation cuối cùng; schema frontend giúp báo lỗi ngay tại từng
trường của form.

| Thư mục/file | Nội dung |
| --- | --- |
| `src/utils/date.js` | Kiểm tra, định dạng ngày/giờ và giá trị cho `input[type=date]` |
| `src/utils/number.js` | Định dạng số, chuyển số nguyên và giới hạn khoảng giá trị |
| `src/utils/string.js` | Chuẩn hóa chuỗi rỗng, tạo slug tiếng Việt và rút gọn chuỗi |
| `src/utils/error.js` | Chuẩn hóa lỗi API và lấy lỗi theo field |
| `src/utils/validation.js` | Chạy Zod schema và chuyển issues thành field errors |
| `src/schemas/` | Schema cho auth, trips, trip stops và reviews |
| `src/composables/useFormValidation.js` | State và hàm validation dùng chung cho Vue forms |

Ví dụ dùng utility độc lập:

```js
import { formatDate, slugify, toInteger } from '@/utils/index.js'

formatDate('2026-08-02') // 02/08/2026
slugify('Đà Lạt mùa Hè') // da-lat-mua-he
toInteger('3') // 3
```

Ví dụ validate trong component:

```vue
<script setup>
import { reactive } from 'vue'
import { useFormValidation } from '@/composables/index.js'
import { loginSchema } from '@/schemas/index.js'

const form = reactive({ identifier: '', password: '' })
const { validate, errorFor } = useFormValidation(loginSchema)

async function submit() {
  const payload = validate(form)
  if (!payload) return

  // payload đã được trim/normalize và có thể gửi tới store hoặc API module.
}
</script>
```

Các form đăng nhập, đăng ký, hồ sơ, đổi mật khẩu, trip và review hiện đều dùng
schema tương ứng. Thông báo validation được hiển thị bên dưới field trước khi
request được gửi.

## Test

```powershell
npm.cmd test
```

Test kiểm tra URL/query, Bearer header, error mapping, state của Pinia stores,
constants, router, utilities và toàn bộ schema validation phía frontend.

## Build production

```powershell
npm.cmd run build
npm.cmd run preview
```

Output production được tạo trong thư mục `dist/`.
