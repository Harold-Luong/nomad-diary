# Location Catalog Lambda

Query service read-only cho catalog địa lý Việt Nam. Lambda nhận event API
Gateway HTTP API v2, validate route/query và đọc tỉnh, phường/xã, địa điểm từ
DynamoDB.

## Vai trò và phạm vi

Đã triển khai:

- Năm public route `GET`.
- Query DynamoDB bằng AWS SDK v3.
- Prefix search, lọc featured và cursor cho danh sách địa điểm.
- Response/error JSON thống nhất và structured error log.
- Container image Lambda Node.js 22 và local Runtime Interface Emulator.
- Frontend Nomad Diary gọi trực tiếp API này khi chọn trip stop.

Chưa triển khai:

- API ghi, admin hoặc đồng bộ dữ liệu.
- Script tạo bảng/index, import hoặc seed DynamoDB.
- Authentication, rate limit và CORS trong handler.
- Infrastructure as Code và automated test.

## Kiến trúc

```text
Vue frontend
   |
   v
API Gateway HTTP API
   |
   v
src/handlers/query.js
   |
   v
src/repositories/location-catalog.repository.js
   |
   v
DynamoDB LocationCatalog
```

Handler nhận diện route, validate input, encode/decode cursor và tạo response.
Repository là lớp duy nhất tạo `GetCommand`/`QueryCommand`.

## Cấu trúc thư mục

```text
location-catalog-lambda/
├── src/
│   ├── handlers/query.js
│   ├── repositories/location-catalog.repository.js
│   └── shared/
│       ├── cursor.js
│       ├── normalize.js
│       └── response.js
├── compose.yaml
├── DEPLOY.md
├── Dockerfile
├── package-lock.json
├── package.json
└── README.md
```

## Yêu cầu

- Node.js 22+ và npm.
- Docker/Compose để chạy container local.
- AWS credentials và quyền DynamoDB cho route dữ liệu.
- Bảng `LocationCatalog` cùng `GSI1`, `GSI2` đã tồn tại.

## Cài đặt

```bash
cd location-catalog-lambda
npm ci
```

`package.json` hiện không có script start, test, import hoặc migrate.

## Cấu hình runtime

Source hiện cố định:

| Cấu hình | Giá trị |
| --- | --- |
| AWS Region | `ap-southeast-1` |
| DynamoDB table | `LocationCatalog` |
| Index | `GSI1`, `GSI2` |
| Lambda handler | `src/handlers/query.handler` |
| Architecture Compose | `linux/amd64` |

`LOG_LEVEL=info` có trong `compose.yaml`, nhưng source chưa đọc biến này.
Tên table/region cũng chưa nhận từ environment variable.

## API

Base path: `/v1`.

| Method | Route | DynamoDB |
| --- | --- | --- |
| `GET` | `/v1/health` | Không |
| `GET` | `/v1/provinces` | Query `GSI1` |
| `GET` | `/v1/provinces/{provinceCode}/wards` | Query base table |
| `GET` | `/v1/provinces/{provinceCode}/wards/{wardCode}/places` | Get ward + query `GSI2` |
| `GET` | `/v1/provinces/{provinceCode}/places/{placeId}` | Get place |

Một trailing slash được chấp nhận. Method khác `GET` trả
`405 METHOD_NOT_ALLOWED`.

### Path parameters

| Parameter | Quy tắc |
| --- | --- |
| `provinceCode` | Chính xác 2 chữ số |
| `wardCode` | Chính xác 5 chữ số |
| `placeId` | 1–64 ký tự chữ, số, `_` hoặc `-` |

### Place list query

Ví dụ:

```http
GET /v1/provinces/48/wards/20242/places?search=cau&featured=true&limit=20
```

| Query | Mặc định | Quy tắc |
| --- | --- | --- |
| `search` | Không có | Sau trim dài 1–100, prefix search |
| `featured` | Không lọc | Chuỗi `true` hoặc `false` |
| `limit` | `20` | Số nguyên 1–50 |
| `cursor` | Không có | Opaque cursor từ response trước |

Search chuẩn hóa Unicode NFD, bỏ dấu, chuyển `đ/Đ` thành `d/D`, lowercase,
trim/gom khoảng trắng rồi đổi khoảng trắng thành `-`. `Cầu Rồng` thành
`cau-rong`.

Cursor chứa `LastEvaluatedKey` và request scope. Nó chỉ dùng lại được với đúng
`provinceCode`, `wardCode`, `search` và `featured`.

## Response contract

Header:

```text
content-type: application/json; charset=utf-8
```

Health:

```json
{
  "data": {
    "service": "location-catalog",
    "status": "ok"
  }
}
```

Province list:

```json
{
  "data": [
    {
      "code": "48",
      "name": "Thành phố Đà Nẵng"
    }
  ],
  "meta": {
    "nextCursor": null
  }
}
```

Ward list:

```json
{
  "data": [
    {
      "code": "20242",
      "provinceCode": "48",
      "name": "Phường An Hải"
    }
  ],
  "meta": {
    "nextCursor": null
  }
}
```

Place list/detail hiện chỉ map bốn field:

```json
{
  "placeId": "01JABC123",
  "provinceCode": "48",
  "wardCode": "20242",
  "name": "Cầu Rồng"
}
```

List bọc các item trong `data` và thêm `meta.nextCursor`; detail đặt object
trực tiếp trong `data`. Projection có đọc thêm description/address/coordinate/
featured nhưng mapper hiện chưa trả các field đó.

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "provinceCode must contain 2 digits",
    "requestId": "api-gateway-request-id"
  }
}
```

| Status | Code |
| ---: | --- |
| `400` | `VALIDATION_ERROR` |
| `404` | `WARD_NOT_FOUND`, `PLACE_NOT_FOUND`, `ROUTE_NOT_FOUND` |
| `405` | `METHOD_NOT_ALLOWED` |
| `500` | `INTERNAL_ERROR` |

`requestId` chỉ có khi event cung cấp. Lỗi ngoài dự kiến được log cùng
request ID/method/path; client chỉ nhận message tổng quát.

## DynamoDB contract

### Access patterns

Province:

```text
IndexName = GSI1
GSI1PK = COUNTRY#VN
status = ACTIVE
```

Wards:

```text
PK = PROVINCE#{provinceCode}
begins_with(SK, "WARD#")
status = ACTIVE
```

Ward existence:

```text
PK = PROVINCE#{provinceCode}
SK = WARD#{wardCode}
entityType = WARD
status = ACTIVE
```

Places by ward:

```text
IndexName = GSI2
GSI2PK = PROVINCE#{provinceCode}#WARD#{wardCode}#PLACES
begins_with(GSI2SK, "STATUS#ACTIVE#NAME#{normalizedPrefix}")
```

`featured` dùng `FilterExpression`, được áp dụng sau DynamoDB read limit. Một
page có thể ít item hơn `limit` nhưng vẫn có `nextCursor`.

Place detail:

```text
PK = PROVINCE#{provinceCode}
SK = PLACE#{placeId}
entityType = PLACE
status = ACTIVE
```

### Item mẫu tối thiểu

```json
{
  "PK": "PROVINCE#48",
  "SK": "WARD#20242",
  "entityType": "WARD",
  "status": "ACTIVE",
  "code": "20242",
  "provinceCode": "48",
  "name": "Phường An Hải"
}
```

```json
{
  "PK": "PROVINCE#48",
  "SK": "PLACE#01JABC123",
  "GSI2PK": "PROVINCE#48#WARD#20242#PLACES",
  "GSI2SK": "STATUS#ACTIVE#NAME#cau-rong#01JABC123",
  "entityType": "PLACE",
  "status": "ACTIVE",
  "placeId": "01JABC123",
  "provinceCode": "48",
  "wardCode": "20242",
  "name": "Cầu Rồng",
  "isFeatured": true
}
```

Province item còn phải xuất hiện trong `GSI1` với
`GSI1PK = COUNTRY#VN`.

### IAM tối thiểu

Execution role cần:

```text
dynamodb:GetItem
dynamodb:Query
```

Resource phải gồm table và indexes. Source không gọi Scan hoặc thao tác ghi.

## Chạy local bằng Docker

Build và chạy:

```bash
cd location-catalog-lambda
BUILDX_NO_DEFAULT_ATTESTATIONS=1 docker compose build
docker compose up
```

Gọi health từ terminal khác:

```bash
curl -sS \
  -X POST \
  'http://localhost:9000/2015-03-31/functions/function/invocations' \
  -H 'content-type: application/json' \
  -d '{
    "version": "2.0",
    "rawPath": "/v1/health",
    "requestContext": {
      "requestId": "local-health",
      "http": { "method": "GET", "path": "/v1/health" }
    }
  }'
```

Dừng:

```bash
docker compose down
```

Health không truy cập DynamoDB. `compose.yaml` không mount AWS credentials và
không chạy DynamoDB Local; route dữ liệu sẽ lỗi nếu container không có
credentials/network/table đúng.

## Kiểm thử và kiểm tra

Module chưa có automated test. Kiểm tra syntax:

```bash
find src -name '*.js' -print0 | xargs -0 -n1 node --check
```

Sau đó build container và smoke test health. Để xác nhận IAM/schema/data, phải
gọi thêm ít nhất một route DynamoDB.

## Deploy

Quy trình container image:

1. Build `linux/amd64`.
2. Smoke test local.
3. Push image lên ECR.
4. Tạo/cập nhật Lambda.
5. Chờ update thành công.
6. Cấu hình năm route API Gateway HTTP API v2.
7. Test health và route DynamoDB.

Chi tiết lệnh và IAM: [DEPLOY.md](DEPLOY.md).

## Giới hạn hiện tại

- Region/table hard-code.
- Province và ward list không phân trang.
- Place response chỉ có bốn field.
- Search chỉ hỗ trợ prefix theo normalized name.
- CORS/auth/throttling nằm ngoài handler.
- Không có IaC, importer, automated test hoặc rollback script.
- `locationCatalogApi.listPlaces` ở frontend tự đi qua tất cả cursor page; với
  ward rất lớn cần cân nhắc search/pagination tại UI.

## Tài liệu liên quan

- [Deploy Lambda](DEPLOY.md)
- [Frontend](../front-end/README.md)
- [Tổng quan repository](../README.md)
- [Mục lục tài liệu](../docs/README.md)
