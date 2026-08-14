# Location Catalog Lambda

API tra cứu catalog địa lý Việt Nam chạy bằng AWS Lambda và đọc dữ liệu từ
DynamoDB.

Module hiện tại chỉ triển khai một **Query Lambda read-only**. Lambda cung cấp
danh sách tỉnh/thành, phường/xã, địa điểm theo phường và chi tiết địa điểm.
Các nội dung từng có trong tài liệu thiết kế cũ như Admin Lambda, Province Sync
Lambda, trình import/migration DynamoDB và test suite không còn nằm trong source
code hiện tại.

## Trạng thái hiện tại

Đã có:

- Lambda handler tương thích event của API Gateway HTTP API.
- Năm route public dùng phương thức `GET`.
- Truy vấn DynamoDB bằng AWS SDK v3.
- Tìm địa điểm theo prefix tên, lọc `featured` và phân trang bằng cursor.
- Docker image dựa trên AWS Lambda Node.js 22.
- Docker Compose để build và gọi Lambda Runtime Interface Emulator ở local.

Chưa có trong module này:

- Infrastructure as Code để tạo API Gateway, Lambda, IAM hoặc DynamoDB.
- Script tạo bảng, tạo index, seed, import hay đồng bộ dữ liệu.
- API tạo, sửa, archive hoặc xóa dữ liệu.
- Authentication/authorization.
- Cấu hình CORS và throttling.
- Automated test và npm script `test`.
- Tích hợp trực tiếp với `front-end` hoặc `back-end` của Nomad Diary.

Do đó bảng DynamoDB và dữ liệu phải tồn tại trước khi gọi các route catalog.

## Luồng xử lý

```text
Client
  |
  v
API Gateway HTTP API
  |
  v
src/handlers/query.handler
  |
  v
src/repositories/location-catalog.repository.js
  |
  v
DynamoDB: LocationCatalog (ap-southeast-1)
```

`query.handler` chịu trách nhiệm nhận diện route, validate path/query, kiểm tra
cursor và tạo HTTP response. Repository là lớp duy nhất tạo `GetCommand` và
`QueryCommand`.

API Gateway, custom domain, CORS, throttling và quyền IAM là hạ tầng bên ngoài
source code này.

## Công nghệ

- Node.js 22 trở lên, ES modules.
- AWS Lambda container image.
- AWS SDK for JavaScript v3.
- DynamoDB Document Client.
- Docker và Docker Compose cho local container.

## Cấu trúc thư mục

```text
location-catalog-lambda/
├── src/
│   ├── handlers/
│   │   └── query.js
│   ├── repositories/
│   │   └── location-catalog.repository.js
│   └── shared/
│       ├── cursor.js
│       ├── normalize.js
│       └── response.js
├── .dockerignore
├── compose.yaml
├── DEPLOY.md
├── Dockerfile
├── package-lock.json
└── package.json
```

## API hiện có

Base path là `/v1`.

| Method | Route | Truy cập DynamoDB | Mô tả |
| --- | --- | --- | --- |
| `GET` | `/v1/health` | Không | Kiểm tra Lambda đang hoạt động |
| `GET` | `/v1/provinces` | Có | Danh sách tỉnh/thành đang active |
| `GET` | `/v1/provinces/{provinceCode}/wards` | Có | Danh sách phường/xã đang active của tỉnh |
| `GET` | `/v1/provinces/{provinceCode}/wards/{wardCode}/places` | Có | Danh sách địa điểm đang active của phường |
| `GET` | `/v1/provinces/{provinceCode}/places/{placeId}` | Có | Lấy một địa điểm đang active |

Handler chấp nhận path có một dấu `/` ở cuối. Mọi HTTP method khác `GET`
trả về `405 METHOD_NOT_ALLOWED`.

### Quy tắc path parameter

| Parameter | Quy tắc |
| --- | --- |
| `provinceCode` | Chính xác 2 chữ số |
| `wardCode` | Chính xác 5 chữ số |
| `placeId` | 1-64 ký tự gồm chữ, số, `_` hoặc `-` |

### Query danh sách địa điểm

```http
GET /v1/provinces/48/wards/20242/places?search=cau&featured=true&limit=20
```

| Query | Mặc định | Quy tắc |
| --- | --- | --- |
| `search` | Không có | Chuỗi sau khi trim dài 1-100 ký tự |
| `featured` | Không lọc | Chỉ nhận chuỗi `true` hoặc `false` |
| `limit` | `20` | Số nguyên từ 1 đến 50 |
| `cursor` | Không có | Cursor opaque do response trước trả về |

`search` là prefix search, không phải full-text hay fuzzy search. Giá trị được:

1. Chuẩn hóa NFD và bỏ các combining mark Unicode.
2. Chuyển thành chữ thường.
3. Trim và gom nhiều khoảng trắng thành một.
4. Đổi khoảng trắng thành dấu `-`.

Ví dụ `Cầu Rồng` trở thành search key `cau-rong`. Repository dùng key này để
query prefix của `GSI2SK`.

`cursor` được encode bằng Base64 URL-safe từ `LastEvaluatedKey` và scope của
request. Cursor chỉ dùng lại được với đúng `provinceCode`, `wardCode`,
`search` và `featured` đã tạo ra nó.

## Response contract

Tất cả response có header:

```text
content-type: application/json; charset=utf-8
```

### Health

```json
{
  "data": {
    "service": "location-catalog",
    "status": "ok"
  }
}
```

### Danh sách tỉnh

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

### Danh sách phường/xã

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

### Danh sách địa điểm

```json
{
  "data": [
    {
      "placeId": "01JABC123",
      "provinceCode": "48",
      "wardCode": "20242",
      "name": "Cầu Rồng"
    }
  ],
  "meta": {
    "nextCursor": "eyJrZXkiOns..."
  }
}
```

`nextCursor` là `null` khi không còn trang tiếp theo.

### Chi tiết địa điểm

```json
{
  "data": {
    "placeId": "01JABC123",
    "provinceCode": "48",
    "wardCode": "20242",
    "name": "Cầu Rồng"
  }
}
```

Tên route là “chi tiết”, nhưng mapper hiện tại chỉ trả bốn field ở trên. Các
field được đọc trong projection như `description`, `address`, `latitude`,
`longitude` và `isFeatured` chưa được đưa vào response.

### Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "provinceCode must contain 2 digits",
    "requestId": "api-gateway-request-id"
  }
}
```

`requestId` chỉ có khi event đầu vào chứa
`requestContext.requestId`.

| HTTP status | Error code có thể gặp |
| --- | --- |
| `400` | `VALIDATION_ERROR` |
| `404` | `WARD_NOT_FOUND`, `PLACE_NOT_FOUND`, `ROUTE_NOT_FOUND` |
| `405` | `METHOD_NOT_ALLOWED` |
| `500` | `INTERNAL_ERROR` |

Lỗi ngoài dự kiến được ghi ra `console.error` dưới dạng JSON với request ID,
method, path, tên lỗi và message. Client chỉ nhận message tổng quát.

## DynamoDB contract

Code đang cố định:

```text
Region:     ap-southeast-1
Table:      LocationCatalog
GSI dùng:   GSI1, GSI2
```

Module không đọc tên bảng hoặc region từ environment variable.

### Access pattern

#### Tỉnh/thành

```text
IndexName = GSI1
GSI1PK = COUNTRY#VN
status = ACTIVE
```

Response lấy `code` và `name`.

#### Phường/xã theo tỉnh

```text
PK = PROVINCE#{provinceCode}
begins_with(SK, "WARD#")
status = ACTIVE
```

Response lấy `code`, `provinceCode` và `name`.

#### Kiểm tra phường/xã

Trước khi query địa điểm, handler đọc:

```text
PK = PROVINCE#{provinceCode}
SK = WARD#{wardCode}
```

Item chỉ hợp lệ khi `entityType = WARD` và `status = ACTIVE`.

#### Địa điểm theo phường

```text
IndexName = GSI2
GSI2PK = PROVINCE#{provinceCode}#WARD#{wardCode}#PLACES
begins_with(
  GSI2SK,
  "STATUS#ACTIVE#NAME#{normalizedSearchPrefix}"
)
```

Khi có `featured`, repository thêm DynamoDB `FilterExpression` trên
`isFeatured`. Filter được áp dụng sau giới hạn đọc của DynamoDB, vì vậy một
trang có thể ít hơn `limit` item dù vẫn còn `nextCursor`.

#### Chi tiết địa điểm

```text
PK = PROVINCE#{provinceCode}
SK = PLACE#{placeId}
```

Item chỉ hợp lệ khi `entityType = PLACE` và `status = ACTIVE`.

### Item tối thiểu mà code mong đợi

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

Item tỉnh còn phải xuất hiện trong `GSI1` với
`GSI1PK = COUNTRY#VN`.

### IAM tối thiểu

Execution role của Lambda cần quyền đọc bảng và index:

```text
dynamodb:GetItem
dynamodb:Query
```

Source code không thực hiện `PutItem`, `UpdateItem`, `DeleteItem` hoặc
`Scan`.

## Cài dependency

```powershell
cd D:\hub\nomad-diary\location-catalog-lambda
npm ci
```

`package.json` hiện không khai báo npm script để start, test, migrate hoặc
import dữ liệu.

## Chạy local bằng Docker

Build image Linux AMD64:

```powershell
cd D:\hub\nomad-diary\location-catalog-lambda
$env:BUILDX_NO_DEFAULT_ATTESTATIONS = "1"
docker compose build
```

Khởi động Lambda Runtime Interface Emulator:

```powershell
docker compose up
```

Gọi health check từ một cửa sổ PowerShell khác:

```powershell
$eventBody = @{
  version = "2.0"
  rawPath = "/v1/health"
  requestContext = @{
    http = @{
      method = "GET"
      path = "/v1/health"
    }
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:9000/2015-03-31/functions/function/invocations" `
  -ContentType "application/json" `
  -Body $eventBody
```

Dừng container:

```powershell
docker compose down
```

`/v1/health` không gọi DynamoDB. Các route dữ liệu cần AWS SDK tìm thấy
credentials hợp lệ và truy cập được bảng `LocationCatalog` ở
`ap-southeast-1`. `compose.yaml` hiện không mount credentials và không cấu
hình DynamoDB Local.

## Docker và Lambda

`Dockerfile`:

- Dùng base image `public.ecr.aws/lambda/nodejs:22`.
- Chỉ cài production dependencies bằng `npm ci --omit=dev`.
- Copy thư mục `src` vào Lambda task root.
- Dùng handler `src/handlers/query.handler`.

`compose.yaml` build và chạy image `nomad-diary/location-catalog:latest` cho
platform `linux/amd64`, map cổng local `9000` vào cổng Lambda `8080`.

Hướng dẫn build image và các bước deploy thủ công hiện có nằm trong
[`DEPLOY.md`](./DEPLOY.md).

Khi cấu hình API Gateway, cả năm route trong bảng API phải trỏ về cùng Query
Lambda integration. Nếu stage không bật auto-deploy, cần deploy lại stage sau
khi thêm hoặc sửa route.

## Kiểm tra source

Module hiện không có automated test. Có thể chạy syntax check cho toàn bộ source:

```powershell
Get-ChildItem src -Recurse -Filter *.js |
  ForEach-Object { node --check $_.FullName }
```

Sau đó build container và gọi `/v1/health` như phần trên. Việc health check
thành công không xác nhận IAM, schema/index hoặc dữ liệu thật trong DynamoDB.

## Giới hạn cần lưu ý

- Region và tên bảng đang hard-code trong repository.
- Chỉ có read API; module không tự tạo hoặc cập nhật catalog.
- Không có endpoint lấy riêng chi tiết tỉnh hay phường/xã.
- Province và ward list chưa có pagination.
- Place response hiện chỉ trả `placeId`, `provinceCode`, `wardCode` và
  `name`.
- Search chỉ hỗ trợ prefix theo normalized name.
- Regex trong `normalize.js` hiện chứa chuỗi mojibake `Ä‘`/`Ä`, nên ký tự
  `đ`/`Đ` chưa được đổi chính xác thành `d`/`D`.
- CORS, auth, rate limit, domain và route deployment không nằm trong source.
- `LOG_LEVEL=info` có trong `compose.yaml`, nhưng source hiện không đọc biến
  này.
- Frontend/backend Nomad Diary hiện vẫn dùng API và dữ liệu địa điểm riêng; chưa
  có code gọi Location Catalog Lambda.
