# Nomad Diary

Thiết kế cơ sở dữ liệu PostgreSQL cho **Nomad Diary** — một nhật ký du lịch cá nhân để lưu chuyến đi, các lần ghé địa điểm, ảnh, đánh giá và thống kê. Mô hình ưu tiên lịch sử cá nhân; đây không phải là thiết kế cho mạng xã hội công khai.

## Nội dung

```text
database/
├── nomad-diary.sql           # Schema, ràng buộc, chỉ mục và trigger
├── nomad-diary-seed.sql      # Dữ liệu mẫu cho môi trường development/test
└── nomad-diary-er.mmd        # ERD Mermaid đầy đủ
```

Schema được tạo trong namespace PostgreSQL `nomad_diary` (không phải tên database).

## Khởi tạo cơ sở dữ liệu

Cần một phiên bản PostgreSQL hỗ trợ identity columns, `jsonb` và GIN indexes. Role chạy lệnh cần quyền tạo schema, bảng, function và trigger.

```bash
createdb -U <user> <database>
psql -v ON_ERROR_STOP=1 -U <user> -d <database> -f database/nomad-diary.sql
```

Script schema tự mở transaction, đặt `search_path` thành `nomad_diary, public` và chỉ reset schema riêng `nomad_diary`. Có thể chạy lại script để dựng lại toàn bộ cấu trúc của ứng dụng mà không xóa các đối tượng khác trong schema `public`.

> **Cảnh báo:** mỗi lần chạy file schema, lệnh `DROP SCHEMA nomad_diary CASCADE` sẽ xóa toàn bộ bảng và dữ liệu Nomad Diary hiện có trước khi dựng lại cấu trúc.

Để nạp dữ liệu mẫu sau khi đã tạo schema:

```bash
psql -v ON_ERROR_STOP=1 -U <user> -d <database> -f database/nomad-diary-seed.sql
```

> **Cảnh báo:** seed chạy `TRUNCATE ... RESTART IDENTITY CASCADE` trên toàn bộ 11 bảng trước khi chèn dữ liệu. Chỉ dùng cho development/test; không dùng trên database có dữ liệu cần giữ lại. Hash mật khẩu và URL trong seed đều là dữ liệu mẫu.

## Mô hình dữ liệu

```mermaid
erDiagram
    USERS ||--o{ TRIPS : owns
    USERS ||--o{ AUTH_SESSIONS : has
    PROVINCES ||--o{ PLACES : contains
    TRIPS ||--o{ TRIP_STOPS : contains
    PLACES ||--o{ TRIP_STOPS : is_visited_in
    TRIP_STOPS ||--o| PLACE_REVIEWS : has
    TRIPS ||--o{ IMAGES : contains
    TRIP_STOPS o|--o{ IMAGES : optionally_groups
    TRIPS ||--o{ TRIP_TAGS : has
    TAGS ||--o{ TRIP_TAGS : labels
    PLACES ||--o{ PLACE_TAGS : has
    TAGS ||--o{ PLACE_TAGS : labels
```

ERD kèm danh sách cột đầy đủ: [nomad-diary-er.mmd](nomad-diary-er.mmd).

| Bảng            | Vai trò                                                               |
| --------------- | --------------------------------------------------------------------- |
| `users`         | Chủ sở hữu nhật ký và chuyến đi.                                      |
| `auth_sessions` | Phiên đăng nhập/refresh token của user; chỉ lưu hash refresh token.   |
| `provinces`     | Tỉnh/thành phố chuẩn hoá; `code` dùng để liên kết GeoJSON ở frontend. |
| `places`        | Địa điểm vật lý dùng lại được, thuộc một tỉnh/thành phố.              |
| `trips`         | Một chuyến đi của một người dùng.                                     |
| `trip_stops`    | Một lần ghé một địa điểm trong một chuyến đi.                         |
| `place_reviews` | Đánh giá cá nhân cho một lần ghé cụ thể.                              |
| `images`        | Ảnh của chuyến đi, có thể gắn với một điểm dừng.                      |
| `tags`          | Danh mục tag dùng chung.                                              |
| `trip_tags`     | Liên kết nhiều-nhiều giữa chuyến đi và tag.                           |
| `place_tags`    | Liên kết nhiều-nhiều giữa địa điểm và tag.                            |

`places` và `trip_stops` là hai khái niệm khác nhau: một `place` chỉ được lưu một lần, còn mỗi lần ghé — kể cả ghé lại cùng địa điểm trong cùng một trip — tạo một `trip_stop` riêng.

## Quy tắc dữ liệu chính

- Hầu hết bảng chính dùng soft delete qua `is_deleted`. Mọi truy vấn nghiệp vụ bình thường phải lọc `is_deleted = false`; các unique index cũng chỉ áp dụng với bản ghi còn hoạt động.
- Mỗi `auth_session` thuộc một user. Phiên chỉ còn hiệu lực khi chưa bị revoke và chưa hết hạn; database chỉ lưu hash của refresh token, không lưu token gốc.
- Username, email và tên tag được unique không phân biệt hoa/thường. Slug còn hoạt động là unique theo phạm vi: trip/user, place/tỉnh-thành và province/quốc gia; tag slug là unique toàn cục.
- `trip_stops.visit_order` phải lớn hơn 0 và duy nhất trong một trip còn hoạt động. Thời điểm rời đi không được sớm hơn thời điểm đến.
- Mỗi `trip_stop` có tối đa một review còn hoạt động; rating là `NULL` hoặc từ 1 đến 5.
- Mỗi ảnh luôn thuộc một `trip`. Nếu có `trip_stop_id`, foreign key kép `(trip_stop_id, trip_id)` bảo đảm điểm dừng thuộc đúng chuyến đi đó. Một trip chỉ có tối đa một ảnh cover còn hoạt động.
- Tọa độ, ngày đi/về, kích thước ảnh và thứ tự ảnh đều có `CHECK` constraint. `images.ai_tags` dùng `jsonb` và có GIN index để phục vụ truy vấn tag AI.
- Trigger `set_updated_at()` tự cập nhật `updated_at` cho tám bảng thực thể chính.

### Giá trị trạng thái

| `trips.status` | Ý nghĩa     |
| -------------: | ----------- |
|              0 | `draft`     |
|              1 | `planned`   |
|              2 | `ongoing`   |
|              3 | `completed` |
|              4 | `cancelled` |

| `place_reviews.revisit_status` | Ý nghĩa            |
| -----------------------------: | ------------------ |
|                              0 | Chưa xác định      |
|                              1 | Nên quay lại       |
|                              2 | Cân nhắc           |
|                              3 | Không nên quay lại |

## Toàn vẹn tham chiếu

- Xóa thật user sẽ cascade tới auth session, trip và các dữ liệu phụ thuộc của trip.
- Không thể xóa thật tỉnh/thành phố khi còn `places`; không thể xóa `place` khi còn `trip_stops` tham chiếu đến nó.
- Xóa `trip_stop` sẽ cascade review và ảnh gắn trực tiếp với điểm dừng; xóa tag sẽ xóa các liên kết tag tương ứng.
- Soft delete không tự cascade. Ứng dụng cần chủ động lọc bản ghi đã xóa và luôn kiểm tra quyền sở hữu trip theo người dùng đã xác thực.

## Dữ liệu mẫu

Seed hiện có một người dùng, 0 auth session, 6 chuyến đi, 10 tỉnh/thành phố, 24 địa điểm, 24 lần ghé, 21 review, 10 tag và 64 ảnh. Auth session không được seed vì được tạo bởi luồng đăng nhập/refresh token lúc chạy ứng dụng. Dữ liệu minh hoạ các trường hợp ghé lại địa điểm qua nhiều chuyến, ghé cùng một nơi nhiều lần trong một chuyến, ảnh cấp trip/stop và các trạng thái đánh giá khác nhau.

## Phạm vi hiện tại

Repository hiện chứa thiết kế database và backend API; chưa có ứng dụng web, Docker configuration hay chính sách phân quyền/RLS. Các tính năng như chi phí, chặng di chuyển, chỗ ở, bạn đồng hành và khoảng cách thực tế chưa thuộc mô hình hiện tại.
