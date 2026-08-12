# Vietnam Location Catalog API

Dịch vụ tra cứu tỉnh/thành, phường/xã và các địa điểm nổi bật tại Việt Nam,
được xây dựng bằng AWS Lambda, API Gateway HTTP API và DynamoDB.

> Trạng thái: đang thiết kế, chưa triển khai source code hoặc hạ tầng AWS.

## Mục tiêu

Dịch vụ cung cấp dữ liệu gợi ý địa lý cho Nomad Diary và các ứng dụng khác:

- Danh sách tỉnh/thành Việt Nam theo dữ liệu hành chính v2 (sau sáp nhập 07/2025).
- Danh sách phường/xã thuộc một tỉnh.
- Danh sách địa điểm nổi bật thuộc một tỉnh.
- Tìm địa điểm theo tên trong phạm vi một tỉnh.
- Cho quản trị viên bổ sung, chỉnh sửa hoặc ẩn địa điểm.

Dịch vụ này là **catalog dùng chung**, không lưu chuyến đi, lịch sử ghé thăm hoặc
địa điểm riêng của từng user. Nomad Diary vẫn là hệ thống sở hữu dữ liệu hành
trình của user.

## Kiến trúc dự kiến

```text
                         ┌──────────────────────────┐
                         │ Province Open API v2     │
                         └────────────┬─────────────┘
                                      │ đồng bộ định kỳ
                            ┌─────────▼──────────┐
                            │ Province Sync      │
                            │ Lambda             │
                            └─────────┬──────────┘
                                      │
┌──────────────┐            ┌─────────▼──────────┐
│ Nomad Diary  │───────────►│ API Gateway       │
│ backend      │            │ HTTP API          │
└──────────────┘            └──────┬───────┬────┘
                                   │       │ JWT + scope
                            ┌──────▼───┐ ┌─▼────────────┐
                            │ Query    │ │ Admin        │
                            │ Lambda   │ │ Lambda       │
                            └──────┬───┘ └─┬────────────┘
                                   │       │
                            ┌──────▼───────▼────┐
                            │ DynamoDB          │
                            │ LocationCatalog   │
                            └───────────────────┘
```

Các thành phần AWS:

- **API Gateway HTTP API:** public HTTP endpoint, routing, CORS và JWT authorizer.
- **Query Lambda:** chỉ có quyền đọc DynamoDB.
- **Admin Lambda:** có quyền ghi dữ liệu catalog; các route phải được xác thực.
- **Province Sync Lambda:** đồng bộ tỉnh và phường/xã từ nguồn hành chính.
- **DynamoDB:** lưu province, ward và place.
- **EventBridge Scheduler:** kích hoạt đồng bộ dữ liệu hành chính định kỳ.
- **CloudWatch:** log, metric và cảnh báo lỗi.
- **AWS SAM:** định nghĩa, chạy local và triển khai hạ tầng.

Lambda không cần đặt trong VPC ở giai đoạn đầu. Thiết kế này không sử dụng NAT
Gateway, RDS hoặc OpenSearch.

## Nguồn dữ liệu

Dữ liệu tỉnh và phường/xã được đồng bộ từ:

```text
https://provinces.open-api.vn/api/v2/
```

Province Open API chỉ cung cấp đơn vị hành chính, không phải catalog đầy đủ các
địa điểm du lịch. Địa điểm nổi bật được quản trị viên biên tập hoặc nhập từ một
nguồn có giấy phép sử dụng phù hợp.

Mỗi item nên lưu `source` để truy vết nguồn dữ liệu:

```text
PROVINCE_OPEN_API
MANUAL
IMPORTED
```

## DynamoDB access patterns

Thiết kế DynamoDB bắt đầu từ các truy vấn mà API cần hỗ trợ:

1. Liệt kê tất cả tỉnh/thành Việt Nam.
2. Lấy thông tin một tỉnh theo `provinceCode`.
3. Liệt kê phường/xã trong một tỉnh.
4. Liệt kê địa điểm trong một tỉnh.
5. Tìm địa điểm theo tiền tố tên trong một tỉnh.
6. Lấy, cập nhật hoặc ẩn một địa điểm theo `provinceCode` và `placeId`.

Không dùng `Scan` toàn bảng trong request thông thường.

## Thiết kế bảng DynamoDB

Tên bảng dự kiến:

```text
LocationCatalog
```

Khóa chính:

```text
Partition key: PK
Sort key:      SK
```

### Province

```json
{
  "PK": "PROVINCE#48",
  "SK": "META",
  "entityType": "PROVINCE",
  "countryCode": "VN",
  "code": "48",
  "name": "Thành phố Đà Nẵng",
  "normalizedName": "thanh pho da nang",
  "administrativeVersion": "2025-v2",
  "status": "ACTIVE",
  "source": "PROVINCE_OPEN_API",
  "GSI1PK": "COUNTRY#VN",
  "GSI1SK": "PROVINCE#48"
}
```

`GSI1` cho phép liệt kê các tỉnh mà không cần scan bảng.

### Ward

```json
{
  "PK": "PROVINCE#48",
  "SK": "WARD#20242",
  "entityType": "WARD",
  "code": "20242",
  "provinceCode": "48",
  "name": "Phường An Hải",
  "normalizedName": "phuong an hai",
  "status": "ACTIVE",
  "source": "PROVINCE_OPEN_API"
}
```

Danh sách ward được query bằng:

```text
PK = PROVINCE#48 AND begins_with(SK, "WARD#")
```

### Place

```json
{
  "PK": "PROVINCE#48",
  "SK": "PLACE#01JABC123",
  "entityType": "PLACE",
  "placeId": "01JABC123",
  "provinceCode": "48",
  "wardCode": "20242",
  "name": "Cầu Rồng",
  "normalizedName": "cau rong",
  "description": "Cây cầu biểu tượng bắc qua sông Hàn.",
  "address": "Nguyễn Văn Linh, Đà Nẵng",
  "latitude": 16.0611,
  "longitude": 108.2276,
  "isFeatured": true,
  "status": "ACTIVE",
  "source": "MANUAL",
  "createdAt": "2026-08-13T00:00:00.000Z",
  "updatedAt": "2026-08-13T00:00:00.000Z",
  "GSI1PK": "PROVINCE#48#PLACES",
  "GSI1SK": "NAME#cau-rong#01JABC123"
}
```

Danh sách place được query bằng:

```text
PK = PROVINCE#48 AND begins_with(SK, "PLACE#")
```

`GSI1` có thể được dùng để tìm theo tiền tố tên đã chuẩn hóa trong một tỉnh.
DynamoDB không phải full-text search engine; tìm một đoạn bất kỳ nằm giữa tên
không phải access pattern cần tối ưu ở phiên bản đầu.

### Khóa chống trùng địa điểm

Khi thêm địa điểm, tạo thêm item giữ tên duy nhất trong phạm vi tỉnh và ward:

```text
PK = PROVINCE#48
SK = UNIQUE#PLACE#cau-rong#20242
```

Admin Lambda dùng `TransactWriteItems` để tạo đồng thời item `PLACE` và item
`UNIQUE`. Item `UNIQUE` được ghi với điều kiện chưa tồn tại, giúp ngăn hai
request đồng thời tạo cùng một địa điểm.

Tên giống nhau chưa luôn đồng nghĩa với cùng một địa điểm. Khi phát hiện trùng,
API nên trả thông tin địa điểm hiện có để quản trị viên quyết định thay vì tự
động ghi đè.

## API contract dự kiến

Base path:

```text
/v1
```

### Public routes

```http
GET /v1/health
GET /v1/provinces
GET /v1/provinces/{provinceCode}
GET /v1/provinces/{provinceCode}/wards
GET /v1/provinces/{provinceCode}/places
GET /v1/provinces/{provinceCode}/places/{placeId}
```

Query địa điểm:

```http
GET /v1/provinces/48/places?search=cau&featured=true&limit=20
```

Quy ước pagination:

```json
{
  "data": [],
  "meta": {
    "nextCursor": null
  }
}
```

`nextCursor` là cursor encode từ `LastEvaluatedKey`, không dùng pagination theo
`page` và `offset` như SQL.

### Admin routes

```http
POST   /v1/admin/provinces/{provinceCode}/places
PATCH  /v1/admin/provinces/{provinceCode}/places/{placeId}
DELETE /v1/admin/provinces/{provinceCode}/places/{placeId}
POST   /v1/admin/sync/provinces
```

Ví dụ tạo địa điểm:

```json
{
  "name": "Cầu Tình Yêu",
  "wardCode": "20242",
  "description": "Điểm đi bộ và ngắm sông Hàn.",
  "address": "Đường Trần Hưng Đạo, Đà Nẵng",
  "latitude": 16.0631,
  "longitude": 108.2295,
  "isFeatured": true
}
```

Xóa địa điểm nên đổi `status` thành `ARCHIVED` thay vì xóa cứng để giữ lịch sử
và tránh làm hỏng dữ liệu đã được hệ thống khác tham chiếu.

## Response và error format

Response thành công:

```json
{
  "data": {
    "code": "48",
    "name": "Thành phố Đà Nẵng"
  }
}
```

Response lỗi:

```json
{
  "error": {
    "code": "PLACE_NOT_FOUND",
    "message": "Place not found",
    "requestId": "api-gateway-request-id"
  }
}
```

Các mã lỗi chính:

```text
VALIDATION_ERROR       400
UNAUTHORIZED           401
FORBIDDEN              403
PROVINCE_NOT_FOUND     404
PLACE_NOT_FOUND        404
PLACE_ALREADY_EXISTS   409
INTERNAL_ERROR         500
```

Không trả stack trace, DynamoDB key nội bộ hoặc thông tin AWS trong response.

## Xác thực và phân quyền

Public `GET` routes có thể không yêu cầu đăng nhập nhưng phải được throttle tại
API Gateway.

Admin routes phải sử dụng JWT authorizer và scope:

```text
location.read
location.write
location.sync
```

IAM role của từng Lambda tuân theo least privilege:

```text
Query Lambda:
- dynamodb:GetItem
- dynamodb:Query

Admin Lambda:
- dynamodb:GetItem
- dynamodb:Query
- dynamodb:PutItem
- dynamodb:UpdateItem
- dynamodb:TransactWriteItems

Sync Lambda:
- dynamodb:GetItem
- dynamodb:Query
- dynamodb:PutItem
- dynamodb:UpdateItem
- dynamodb:BatchWriteItem
```

## Đồng bộ Province Open API

Luồng đồng bộ dự kiến:

```text
EventBridge Scheduler
        ↓
Province Sync Lambda
        ↓
GET https://provinces.open-api.vn/api/v2/?depth=2
        ↓
validate + normalize
        ↓
BatchWrite vào DynamoDB
```

Yêu cầu:

- Có timeout khi gọi API bên ngoài.
- Retry có giới hạn và exponential backoff.
- Không xóa dữ liệu cũ nếu response mới không hợp lệ hoặc không đầy đủ.
- Ghi `lastSyncedAt` và `administrativeVersion`.
- Log số province/ward được thêm, cập nhật và bỏ qua.
- Có thể chạy thủ công qua admin route khi cần.

## Quy tắc dữ liệu địa điểm

- `name` và `provinceCode` là bắt buộc.
- `wardCode` là tùy chọn nhưng phải thuộc đúng tỉnh nếu được cung cấp.
- Latitude nằm trong `[-90, 90]`.
- Longitude nằm trong `[-180, 180]`.
- Không dùng tọa độ `0, 0` để thay cho dữ liệu thiếu.
- `normalizedName` được sinh tại backend, không tin giá trị từ client.
- Chỉ trả địa điểm có `status = ACTIVE` trên public routes.
- Mọi thay đổi admin phải lưu `createdAt`, `updatedAt` và nguồn dữ liệu.

## Tích hợp với Nomad Diary

Luồng tra cứu:

```text
Nomad Diary frontend
        ↓
Nomad Diary backend
        ↓
Vietnam Location Catalog API
```

Khi user chọn một địa điểm, Nomad Diary nên lưu snapshot tối thiểu vào database
của mình:

```text
externalPlaceId
provinceCode
provinceName
placeName
wardName
address
latitude
longitude
```

Nomad Diary không nên chỉ lưu `externalPlaceId`, vì nhật ký cũ vẫn phải hiển thị
khi catalog tạm thời không truy cập được hoặc địa điểm đã đổi tên.

Địa điểm user tự nhập cho nhật ký cá nhân được lưu trong Nomad Diary. Không tự
động đưa địa điểm riêng của user vào catalog dùng chung. Tính năng đóng góp địa
điểm và quy trình duyệt có thể được bổ sung ở phiên bản sau.

## Cấu trúc project dự kiến

```text
lamda/
├── src/
│   ├── handlers/
│   │   ├── query.js
│   │   ├── admin.js
│   │   └── sync.js
│   ├── repositories/
│   │   └── locations.repository.js
│   ├── services/
│   │   ├── locations.service.js
│   │   └── province-sync.service.js
│   ├── schemas/
│   └── shared/
├── tests/
│   ├── unit/
│   └── integration/
├── events/
├── template.yaml
├── samconfig.toml.example
├── package.json
└── README.md
```

## Biến môi trường dự kiến

```env
TABLE_NAME=LocationCatalog
ADMIN_JWT_ISSUER=
ADMIN_JWT_AUDIENCE=
PROVINCES_API_BASE_URL=https://provinces.open-api.vn/api/v2
PROVINCES_SYNC_TIMEOUT_MS=5000
LOG_LEVEL=info
```

Không commit secret, access key hoặc file cấu hình AWS cá nhân vào repository.
Lambda sử dụng IAM execution role, không dùng access key đặt trong environment.

## Phát triển local dự kiến

Yêu cầu:

- Node.js 22 hoặc runtime được chọn trong `template.yaml`.
- Docker Desktop.
- AWS CLI.
- AWS SAM CLI.

Các lệnh sẽ được bổ sung sau khi scaffold source code:

```sh
sam build
sam local start-api
sam validate
sam deploy --guided
```

DynamoDB local có thể được dùng cho integration test. Unit test nên mock
DynamoDB Document Client và không phụ thuộc tài khoản AWS thật.

## Quan sát và giới hạn chi phí

- DynamoDB dùng capacity mode `PAY_PER_REQUEST` ở giai đoạn đầu.
- Đặt timeout và reserved concurrency cho Lambda.
- Bật API Gateway throttling cho public routes.
- Không log request body của admin nếu có dữ liệu nhạy cảm.
- Tạo AWS Budget trước khi triển khai.
- CloudWatch alarm cho Lambda errors, throttles và duration.
- Theo dõi DynamoDB throttled requests và consumed capacity.

## Lộ trình triển khai

### Giai đoạn 1 — Read-only catalog

- Scaffold AWS SAM.
- Tạo bảng DynamoDB và GSI1.
- Import province/ward từ API v2.
- Viết public query routes.
- Thêm validation, pagination cursor và test.

### Giai đoạn 2 — Quản trị địa điểm

- Thêm Cognito/JWT authorizer.
- Viết CRUD địa điểm.
- Chống trùng bằng conditional transaction.
- Soft delete bằng trạng thái `ARCHIVED`.

### Giai đoạn 3 — Tự động hóa

- EventBridge scheduled sync.
- CloudWatch dashboard và alarms.
- CI/CD cho test và `sam deploy`.
- Custom domain nếu cần.

### Giai đoạn 4 — Tích hợp Nomad Diary

- Nomad Diary backend gọi catalog API.
- Combobox tỉnh lấy từ catalog.
- Combobox place kết hợp địa điểm catalog, địa điểm user từng đi và lựa chọn tự nhập.
- Catalog lỗi không được chặn user ghi nhật ký.

## Ngoài phạm vi phiên bản đầu

- Full-text search bằng OpenSearch.
- Tìm địa điểm theo bán kính hoặc geospatial index.
- Route planning và tính khoảng cách.
- Lưu lịch sử chuyến đi của user.
- Đồng bộ Google Places hoặc dịch vụ bản đồ có phí.
- Cho phép đóng góp công khai không qua kiểm duyệt.
