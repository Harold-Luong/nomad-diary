# Tài liệu Nomad Diary

Thư mục này là mục lục cho tài liệu của toàn repository. Mỗi module giữ README
gần source code của module; tài liệu tại đây chỉ định tuyến và quy ước, không
lặp lại contract chi tiết.

## Bản đồ tài liệu

| Phạm vi | Tài liệu | Nội dung chính |
| --- | --- | --- |
| Toàn hệ thống | [README gốc](../README.md) | Kiến trúc, khởi động nhanh và liên kết giữa các module |
| Frontend | [front-end/README.md](../front-end/README.md) | Cấu hình Vite, auth session, API client, route, test và build |
| Backend | [back-end/README.md](../back-end/README.md) | Cấu hình Express/PostgreSQL, API, auth, upload và vận hành |
| Database | [database/README.md](../database/README.md) | Schema, migration, seed, mô hình và quy tắc dữ liệu |
| PostgreSQL trên AWS | [database/AWS.md](../database/AWS.md) | Kết nối RDS bằng SSL, migration và kiểm tra sau triển khai |
| Location Catalog | [location-catalog-lambda/README.md](../location-catalog-lambda/README.md) | API read-only, DynamoDB contract và chạy local |
| Deploy Location Catalog | [location-catalog-lambda/DEPLOY.md](../location-catalog-lambda/DEPLOY.md) | Build image, ECR, Lambda, API Gateway và smoke test |
| ERD | [database/nomad-diary-er.mmd](../database/nomad-diary-er.mmd) | Quan hệ và cột của mô hình PostgreSQL |
| Backend OpenAPI | [`GET /api-docs`](http://localhost:3000/api-docs) | Contract request/response của REST API khi backend đang chạy |

## Source of truth

Khi tài liệu và source khác nhau, ưu tiên nguồn theo thứ tự sau:

1. Schema và migration trong `database/` quyết định cấu trúc PostgreSQL.
2. `back-end/src/docs/openapi.js` quyết định contract REST API backend.
3. Route/schema/repository trong từng module quyết định hành vi runtime.
4. `package.json` quyết định script và phiên bản Node.js được hỗ trợ.
5. README giải thích cách sử dụng các nguồn trên.

Không sao chép toàn bộ OpenAPI vào README backend. README chỉ liệt kê nhóm
endpoint và luồng sử dụng; payload chi tiết được xem qua Swagger/OpenAPI để giảm
nguy cơ hai tài liệu lệch nhau.

## Cấu trúc chuẩn của README module

README của một module nên dùng thứ tự sau, bỏ qua mục không phù hợp:

1. Vai trò và phạm vi.
2. Kiến trúc hoặc luồng xử lý.
3. Cấu trúc thư mục.
4. Yêu cầu môi trường.
5. Cài đặt và cấu hình.
6. Chạy local.
7. API hoặc contract dữ liệu.
8. Kiểm thử, build và deploy.
9. Bảo mật, giới hạn và xử lý lỗi.
10. Tài liệu liên quan.

## Quy ước cập nhật

- Lệnh mặc định dùng shell đa nền tảng (`npm`, đường dẫn tương đối). Chỉ dùng
  PowerShell khi lệnh phụ thuộc cú pháp PowerShell.
- Không đưa secret, mật khẩu thật, AWS account ID hoặc endpoint RDS cụ thể vào
  tài liệu. Dùng placeholder có tên rõ ràng.
- Biến `VITE_*` là dữ liệu public trong frontend bundle, không dùng cho secret.
- Phải ghi cảnh báo ngay trước lệnh reset schema, truncate seed hoặc thay đổi hạ
  tầng production.
- Sau khi thêm route, biến môi trường, migration hoặc npm script, cập nhật README
  của module và README gốc nếu thay đổi ảnh hưởng đến module khác.
- Liên kết nội bộ dùng đường dẫn tương đối để hoạt động trên GitHub và IDE.
