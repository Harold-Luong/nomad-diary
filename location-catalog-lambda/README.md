# Vietnam Location Catalog API

Dịch vụ catalog địa lý dùng chung cung cấp dữ liệu **tỉnh/thành, phường/xã và địa điểm nổi bật tại Việt Nam**, được thiết kế theo kiến trúc serverless trên AWS với **API Gateway HTTP API, AWS Lambda và DynamoDB**.

> **Trạng thái:** Thiết kế kiến trúc. Chưa triển khai source code hoặc hạ tầng AWS.

---

# 1. Mục tiêu

Vietnam Location Catalog API là một service độc lập cung cấp dữ liệu địa lý chuẩn hóa cho **Nomad Diary** và có khả năng được tái sử dụng bởi các ứng dụng khác trong tương lai.

Service cung cấp:

* Danh sách tỉnh/thành Việt Nam theo dữ liệu hành chính v2 sau sáp nhập 07/2025.
* Danh sách phường/xã thuộc một tỉnh.
* Danh sách địa điểm nổi bật thuộc một tỉnh.
* Tìm địa điểm theo tên trong phạm vi một tỉnh.
* Thông tin chi tiết của một địa điểm.
* API quản trị để thêm, chỉnh sửa hoặc ẩn địa điểm.
* Đồng bộ dữ liệu hành chính định kỳ.

Service này là **shared catalog**, không sở hữu dữ liệu nghiệp vụ của Nomad Diary.

Catalog **không lưu**:

* Trip của user.
* Trip stop.
* Lịch sử ghé thăm.
* Rating của user.
* Ảnh.
* Địa điểm cá nhân do user tự nhập.
* Quan hệ giữa user và địa điểm.

Các dữ liệu trên tiếp tục thuộc quyền sở hữu của Nomad Diary.

---

# 2. Nguyên tắc kiến trúc

Hệ thống được chia thành hai domain rõ ràng:

```text
LOCATION CATALOG
──────────────────────────────
Province
Ward
Place
Administrative data

        độc lập với

NOMAD DIARY
──────────────────────────────
User
Trip
Trip Stop
Image
Review
Visited Place
User-created Place
```

Location Catalog là nguồn dữ liệu tham khảo.

Nomad Diary là hệ thống sở hữu dữ liệu hành trình của user.

Một địa điểm bị đổi tên hoặc archive trong Catalog **không được làm thay đổi nhật ký lịch sử đã được lưu trong Nomad Diary**.

---

# 3. Kiến trúc tổng thể

```text
                         ┌───────────────────────────┐
                         │ Province Open API v2      │
                         └─────────────┬─────────────┘
                                       │
                                       │ scheduled sync
                                       ▼
                            ┌─────────────────────┐
                            │ Province Sync       │
                            │ Lambda              │
                            └──────────┬──────────┘
                                       │
                                       ▼
┌─────────────────┐          ┌─────────────────────┐
│ Nomad Diary FE  │          │                     │
│ Vue SPA         │─────────►│ API Gateway         │
└────────┬────────┘ Public   │ HTTP API            │
         │          GET      │                     │
         │                   └─────┬────────┬──────┘
         │                         │        │
         │                         │        │ JWT + scope
         │                  ┌──────▼───┐ ┌──▼──────────┐
         │                  │ Query    │ │ Admin       │
         │                  │ Lambda   │ │ Lambda      │
         │                  └──────┬───┘ └──┬──────────┘
         │                         │        │
         │                         └────┬───┘
         │                              ▼
         │                    ┌───────────────────┐
         │                    │ DynamoDB          │
         │                    │ LocationCatalog   │
         │                    └───────────────────┘
         │
         │ create/update trip
         ▼
┌───────────────────────┐
│ Nomad Diary Backend   │
│ Express / EC2         │
└───────────┬───────────┘
            │
            ├────────────────────► PostgreSQL RDS
            │
            │ validate catalog place /
            │ obtain canonical snapshot
            ▼
     Location Catalog API
```

Hai đường request khác nhau được cố ý tách biệt:

```text
Catalog lookup

Vue
 ↓
API Gateway
 ↓
Query Lambda
 ↓
DynamoDB
```

và:

```text
Nomad Diary business operation

Vue
 ↓
ALB
 ↓
Nomad Diary Express
 ↓
PostgreSQL RDS
```

Backend Nomad Diary chỉ gọi Catalog API khi cần xác minh một địa điểm hoặc lấy dữ liệu chuẩn trước khi tạo snapshot.

---

# 4. Thành phần AWS

## 4.1 API Gateway HTTP API

API Gateway là public entry point của Location Catalog.

Trách nhiệm:

* HTTP routing.
* CORS.
* JWT Authorizer cho admin API.
* Throttling.
* Mapping request tới Lambda.
* Request ID.
* Custom domain trong tương lai nếu cần.

Không chứa business logic.

---

# 5. Lambda Functions

Phiên bản đầu sử dụng **3 Lambda chính**.

```text
Lambda
├── Query Lambda
├── Admin Lambda
└── Province Sync Lambda
```

Không áp dụng mô hình:

```text
1 endpoint = 1 Lambda
```

Một Lambda có thể phục vụ nhiều route có cùng responsibility.

---

## 5.1 Query Lambda

Chỉ phục vụ public read operations.

```text
GET province
GET wards
GET places
GET place detail
GET place search
```

IAM chỉ cấp:

```text
dynamodb:GetItem
dynamodb:Query
```

Không có quyền:

```text
PutItem
UpdateItem
DeleteItem
BatchWriteItem
```

Query Lambda có thể được gọi trực tiếp từ Nomad Diary frontend thông qua API Gateway.

---

## 5.2 Admin Lambda

Phục vụ thao tác quản trị:

```text
Create Place
Update Place
Archive Place
Manual Sync Trigger
```

Các request phải được xác thực.

IAM:

```text
dynamodb:GetItem
dynamodb:Query
dynamodb:PutItem
dynamodb:UpdateItem
dynamodb:TransactWriteItems
```

---

## 5.3 Province Sync Lambda

Đồng bộ dữ liệu hành chính từ Province Open API.

Có thể được kích hoạt bởi:

```text
EventBridge Scheduler
```

hoặc manual admin operation.

IAM:

```text
dynamodb:GetItem
dynamodb:Query
dynamodb:PutItem
dynamodb:UpdateItem
dynamodb:BatchWriteItem
```

---

# 6. Network

Lambda không cần nằm trong VPC ở phiên bản đầu.

```text
Internet
   │
   ▼
API Gateway
   │
   ▼
Lambda
   │
   ▼
DynamoDB
```

Province Sync:

```text
Lambda
   │
   ▼
Internet
   │
   ▼
Province Open API
```

Thiết kế này không cần:

* NAT Gateway.
* Internet Gateway riêng cho Lambda.
* RDS.
* EC2.
* OpenSearch.
* ElastiCache.

Điều này giúp Location Catalog giữ kiến trúc nhỏ và độc lập với infrastructure của Nomad Diary.

---

# 7. Nguồn dữ liệu

Dữ liệu tỉnh và phường/xã được đồng bộ từ:

```text
https://provinces.open-api.vn/api/v2/
```

Province Open API chỉ được sử dụng cho **administrative data**.

Nó không được coi là nguồn đầy đủ cho:

```text
tourist attraction
restaurant
cafe
hotel
landmark
natural attraction
```

Place catalog được:

```text
MANUAL
```

hoặc:

```text
IMPORTED
```

từ nguồn có quyền sử dụng phù hợp.

Mỗi entity phải lưu nguồn:

```text
PROVINCE_OPEN_API
MANUAL
IMPORTED
```

---

# 8. DynamoDB

Tên bảng:

```text
LocationCatalog
```

Capacity mode ban đầu:

```text
PAY_PER_REQUEST
```

Primary key:

```text
PK
SK
```

Thiết kế theo access pattern, không thiết kế theo quan hệ như PostgreSQL.

---

# 9. Access patterns

Hệ thống phải hỗ trợ:

```text
1. List provinces
2. Get province
3. List wards by province
4. List places by province
5. Search places by name prefix within province
6. Get place
7. Create place
8. Update place
9. Archive place
```

Request thông thường không sử dụng:

```text
Scan
```

---

# 10. Province entity

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

GSI1:

```text
GSI1PK = COUNTRY#VN
```

cho phép:

```text
GET /v1/provinces
```

mà không cần Scan.

---

# 11. Ward entity

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

Query:

```text
PK = PROVINCE#48
AND begins_with(SK, "WARD#")
```

---

# 12. Place entity

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

List place:

```text
PK = PROVINCE#48
AND begins_with(SK, "PLACE#")
```

Search theo prefix sử dụng GSI.

Ví dụ:

```text
c
ca
cau
cau r
```

DynamoDB không được sử dụng như full-text search engine.

Version đầu không tối ưu cho:

```text
contains(name, "rong")
```

hoặc fuzzy search.

---

# 13. Chống trùng Place

Khi tạo địa điểm, tạo thêm unique-lock item:

```text
PK = PROVINCE#48
SK = UNIQUE#PLACE#cau-rong#20242
```

Admin Lambda sử dụng:

```text
TransactWriteItems
```

để tạo đồng thời:

```text
PLACE item
+
UNIQUE item
```

UNIQUE item sử dụng conditional expression:

```text
attribute_not_exists(PK)
```

Nếu đã tồn tại:

```text
409 PLACE_ALREADY_EXISTS
```

API trả địa điểm hiện tại để admin quyết định.

Không tự động overwrite.

---

# 14. Public API

Base path:

```text
/v1
```

Routes:

```http
GET /v1/health

GET /v1/provinces
GET /v1/provinces/{provinceCode}

GET /v1/provinces/{provinceCode}/wards

GET /v1/provinces/{provinceCode}/places
GET /v1/provinces/{provinceCode}/places/{placeId}
```

Search:

```http
GET /v1/provinces/48/places?search=cau
```

Filter:

```http
GET /v1/provinces/48/places?featured=true
```

Pagination:

```http
GET /v1/provinces/48/places?limit=20&cursor=...
```

---

# 15. Pagination

Không sử dụng SQL-style pagination:

```text
page=3
offset=40
```

Sử dụng DynamoDB cursor.

Response:

```json
{
  "data": [],
  "meta": {
    "nextCursor": null
  }
}
```

`nextCursor` được encode từ:

```text
LastEvaluatedKey
```

Client không cần hiểu cấu trúc DynamoDB key bên trong cursor.

---

# 16. UI access pattern

Nomad Diary frontend có thể gọi public Catalog API trực tiếp.

Khi mở form:

```text
Create Trip
    │
    ▼
GET /v1/provinces
```

User chọn province:

```text
Province
[ Đà Nẵng ▼ ]
       │
       │ provinceCode = 48
       │
       ├────────────────────┐
       ▼                    ▼
GET /48/wards          GET /48/places
       │                    │
       ▼                    ▼
Ward options           Place options
```

Hai request có thể chạy song song.

---

# 17. Search từ frontend

Không gọi API sau mỗi keystroke ngay lập tức.

Ví dụ user nhập:

```text
c
ca
cau
cau r
cau ro
cau rong
```

Frontend sử dụng debounce khoảng:

```text
300–500 ms
```

sau đó mới gọi:

```http
GET /v1/provinces/48/places?search=cau
```

Nếu search mới bắt đầu trước khi request cũ hoàn thành, frontend nên hủy hoặc bỏ qua response cũ.

---

# 18. Client caching

Province data thay đổi rất ít.

Frontend nên cache:

```text
provinceCache
```

trong session/application state.

Có thể cache:

```text
wardCache
  ├── province 48
  └── province 01

placeCache
  ├── province 48
  └── province 01
```

Không gọi lại API nếu dữ liệu phù hợp đã có và chưa cần refresh.

Catalog vẫn phải hoạt động đúng khi client không cache.

---

# 19. Admin API

Routes:

```http
POST   /v1/admin/provinces/{provinceCode}/places

PATCH  /v1/admin/provinces/{provinceCode}/places/{placeId}

DELETE /v1/admin/provinces/{provinceCode}/places/{placeId}

POST   /v1/admin/sync/provinces
```

Ví dụ create:

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

---

# 20. Soft delete

DELETE không xóa vật lý Place.

Thay vào đó:

```text
ACTIVE
   ↓
ARCHIVED
```

Public API chỉ trả:

```text
status = ACTIVE
```

Admin có thể truy cập archived item nếu cần.

Điều này bảo vệ các hệ thống đang tham chiếu tới place cũ.

---

# 21. Authentication và Authorization

Public routes:

```text
GET /v1/*
```

không bắt buộc login ở version đầu.

API Gateway áp dụng throttling.

Admin routes sử dụng JWT Authorizer.

Scopes:

```text
location.read
location.write
location.sync
```

Ví dụ:

```text
POST /places
→ location.write

PATCH /places/{id}
→ location.write

DELETE /places/{id}
→ location.write

POST /sync/provinces
→ location.sync
```

---

# 22. CORS

Vì Nomad Diary frontend gọi Catalog API trực tiếp, API Gateway phải cấu hình CORS.

Production origin:

```text
https://nomad-diary.site
```

Development origin:

```text
http://localhost:<frontend-port>
```

Không mặc định mở:

```text
Access-Control-Allow-Origin: *
```

nếu API sau này có authenticated browser routes hoặc credentials.

Allowed methods public:

```text
GET
OPTIONS
```

Admin API bổ sung:

```text
POST
PATCH
DELETE
```

---

# 23. Response format

Success:

```json
{
  "data": {
    "code": "48",
    "name": "Thành phố Đà Nẵng"
  }
}
```

Collection:

```json
{
  "data": [],
  "meta": {
    "nextCursor": null
  }
}
```

---

# 24. Error format

```json
{
  "error": {
    "code": "PLACE_NOT_FOUND",
    "message": "Place not found",
    "requestId": "api-gateway-request-id"
  }
}
```

Error codes:

```text
VALIDATION_ERROR          400
UNAUTHORIZED              401
FORBIDDEN                 403

PROVINCE_NOT_FOUND        404
WARD_NOT_FOUND            404
PLACE_NOT_FOUND           404

PLACE_ALREADY_EXISTS      409

RATE_LIMITED              429

INTERNAL_ERROR            500
```

Không trả:

* Stack trace.
* DynamoDB PK/SK.
* AWS account information.
* Internal exception.
* Credential.
* Secret.

---

# 25. Validation

Place:

```text
name
```

bắt buộc.

```text
provinceCode
```

bắt buộc.

`wardCode` là optional.

Nếu có wardCode:

```text
ward.provinceCode === place.provinceCode
```

phải đúng.

Latitude:

```text
-90 <= latitude <= 90
```

Longitude:

```text
-180 <= longitude <= 180
```

Không sử dụng:

```text
0, 0
```

để biểu diễn missing coordinate.

Nếu không có coordinate:

```text
latitude = undefined
longitude = undefined
```

---

# 26. Normalize dữ liệu

Client không được gửi `normalizedName` làm nguồn dữ liệu chuẩn.

Backend tự tạo:

```text
Cầu Rồng
   ↓
cau rong
```

Normalization phải nhất quán giữa:

```text
create
update
search
unique-key generation
```

---

# 27. Province synchronization

Luồng:

```text
EventBridge Scheduler
        │
        ▼
Province Sync Lambda
        │
        ▼
Province Open API v2
        │
        ▼
validate
        │
        ▼
normalize
        │
        ▼
compare
        │
        ▼
DynamoDB
```

Endpoint nguồn:

```text
GET /api/v2/?depth=2
```

---

# 28. Quy tắc sync

Sync Lambda phải:

* Có HTTP timeout.
* Retry giới hạn.
* Exponential backoff.
* Validate response.
* Không phá dữ liệu hiện tại khi upstream lỗi.
* Không xóa dữ liệu chỉ vì response mới thiếu.
* Ghi thời gian sync.
* Ghi administrative version.
* Log thống kê.

Ví dụ log:

```json
{
  "event": "province_sync_completed",
  "provincesAdded": 2,
  "provincesUpdated": 3,
  "wardsAdded": 20,
  "wardsUpdated": 12,
  "skipped": 0
}
```

---

# 29. EventBridge Scheduler

Sync không cần server chạy liên tục.

```text
EventBridge
     │
     │ schedule
     ▼
Sync Lambda
     │
     ▼
Province API
     │
     ▼
DynamoDB
```

Schedule cụ thể được quyết định khi triển khai.

Ngoài scheduled sync, admin có thể trigger manual sync.

---

# 30. Tích hợp Nomad Diary

Catalog lookup:

```text
Nomad Diary FE
      │
      ▼
Location Catalog API
```

Không cần đi:

```text
FE
 ↓
Nomad Diary Backend
 ↓
Catalog
```

cho những public lookup thông thường.

Điều này tránh một network hop không cần thiết.

---

# 31. Lưu Place vào Trip

Khi user chọn một catalog place, frontend giữ identifier:

```json
{
  "externalPlaceId": "01JABC123",
  "provinceCode": "48"
}
```

Khi user lưu trip:

```text
Vue
 │
 │ externalPlaceId
 ▼
Nomad Diary Backend
 │
 │ GET canonical place
 ▼
Location Catalog API
 │
 ▼
Nomad Diary Backend
 │
 │ create snapshot
 ▼
PostgreSQL RDS
```

Frontend không được coi là canonical source cho:

```text
placeName
provinceName
wardName
address
latitude
longitude
```

---

# 32. Snapshot

Nomad Diary lưu snapshot tối thiểu:

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

Ví dụ:

```json
{
  "externalPlaceId": "01JABC123",
  "provinceCode": "48",
  "provinceName": "Thành phố Đà Nẵng",
  "placeName": "Cầu Rồng",
  "wardName": "Phường An Hải",
  "address": "Nguyễn Văn Linh, Đà Nẵng",
  "latitude": 16.0611,
  "longitude": 108.2276
}
```

Snapshot được lấy từ Catalog API tại thời điểm ghi.

---

# 33. Tại sao cần snapshot?

Giả sử năm 2026:

```text
Place
Cầu ABC
```

Năm 2028 catalog đổi:

```text
Cầu ABC
→ Cầu XYZ
```

Trip năm 2026 vẫn phải có khả năng hiển thị dữ liệu tại thời điểm user lưu.

Tương tự nếu Catalog API:

```text
temporarily unavailable
```

Nomad Diary vẫn đọc nhật ký từ RDS bình thường.

Do đó không thiết kế:

```text
Trip Stop
   │
   └── externalPlaceId ONLY
```

mà thiết kế:

```text
Trip Stop
   │
   ├── externalPlaceId
   │
   └── place snapshot
```

---

# 34. User-created Place

Nếu user không tìm thấy địa điểm:

```text
Search
  ↓
No result
  ↓
Enter manually
```

địa điểm đó thuộc Nomad Diary.

```text
Nomad Diary RDS
```

Không tự động:

```text
User Place
   ↓
Location Catalog
```

Điều này tránh biến shared catalog thành bãi chứa dữ liệu chưa kiểm duyệt.

Trong tương lai có thể xây dựng:

```text
User contribution
      ↓
Pending
      ↓
Admin review
      ↓
Approved
      ↓
Catalog
```

nhưng không nằm trong version đầu.

---

# 35. Catalog failure strategy

Catalog không được trở thành dependency bắt buộc khiến user không thể ghi nhật ký.

Ví dụ:

```text
Catalog unavailable
        │
        ▼
User vẫn có thể
nhập place manually
        │
        ▼
Save Trip
```

Nếu user đang chọn một `externalPlaceId` nhưng backend không thể validate vì Catalog lỗi, behavior cụ thể cần được xác định ở tầng Nomad Diary theo mức độ consistency mong muốn.

Nguyên tắc:

```text
Catalog hỗ trợ Nomad Diary.

Catalog không được khóa toàn bộ Nomad Diary.
```

---

# 36. Project structure

```text
location-catalog/
├── src/
│   ├── handlers/
│   │   ├── query.js
│   │   ├── admin.js
│   │   └── sync.js
│   │
│   ├── repositories/
│   │   └── locations.repository.js
│   │
│   ├── services/
│   │   ├── locations.service.js
│   │   └── province-sync.service.js
│   │
│   ├── schemas/
│   │   ├── place.schema.js
│   │   └── query.schema.js
│   │
│   └── shared/
│       ├── response.js
│       ├── normalize.js
│       ├── cursor.js
│       └── logger.js
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── events/
│
├── template.yaml
├── samconfig.toml.example
├── package.json
└── README.md
```

Tên `location-catalog` được ưu tiên hơn typo:

```text
lamda/
```

---

# 37. Environment variables

```env
TABLE_NAME=LocationCatalog

ADMIN_JWT_ISSUER=
ADMIN_JWT_AUDIENCE=

PROVINCES_API_BASE_URL=https://provinces.open-api.vn/api/v2
PROVINCES_SYNC_TIMEOUT_MS=5000

LOG_LEVEL=info
```

Không đặt AWS access key trong environment.

Lambda sử dụng:

```text
IAM Execution Role
```

AWS SDK tự lấy temporary credentials từ execution environment.

---

# 38. Local development

Yêu cầu:

* Node.js runtime tương ứng `template.yaml`.
* Docker Desktop.
* AWS CLI.
* AWS SAM CLI.

Commands:

```sh
sam validate
sam build
sam local start-api
```

Deploy lần đầu:

```sh
sam deploy --guided
```

Sau khi có `samconfig.toml`:

```sh
sam deploy
```

---

# 39. Testing

## Unit test

Mock:

```text
DynamoDB Document Client
```

Không phụ thuộc AWS account thật.

Test:

```text
normalization
validation
cursor encode/decode
service logic
duplicate handling
response mapping
```

## Integration test

Có thể sử dụng:

```text
DynamoDB Local
```

Test:

```text
Query
GetItem
TransactWriteItems
pagination
GSI access
```

---

# 40. Logging

Sử dụng structured log.

Ví dụ:

```json
{
  "level": "info",
  "event": "place_query",
  "provinceCode": "48",
  "durationMs": 23,
  "resultCount": 20
}
```

Không log:

```text
JWT
Authorization header
credentials
secret
sensitive admin request data
```

---

# 41. Monitoring

CloudWatch theo dõi:

```text
Lambda Errors
Lambda Duration
Lambda Throttles

API Gateway 4xx
API Gateway 5xx
API Gateway Latency

DynamoDB ThrottledRequests
DynamoDB ConsumedCapacity
```

Tạo alarm cho lỗi đáng chú ý.

---

# 42. Cost control

Version đầu ưu tiên kiến trúc:

```text
API Gateway HTTP API
        +
Lambda
        +
DynamoDB PAY_PER_REQUEST
```

Không chạy server 24/7 riêng cho Catalog.

Đặt:

```text
Lambda timeout
reserved concurrency
API Gateway throttling
AWS Budget
```

để tránh runaway cost.

---

# 43. Security

Nguyên tắc:

```text
least privilege
```

Mỗi Lambda có IAM role phù hợp với nhiệm vụ.

Không sử dụng chung một role có:

```text
dynamodb:*
```

cho tất cả Lambda.

Public Query Lambda không được quyền ghi.

Admin API bắt buộc authorization.

Không commit:

```text
AWS access key
AWS secret key
JWT secret
samconfig chứa secret
.env production
```

---

# 44. Version 1 scope

Version đầu tập trung vào:

```text
Province
Ward
Place

Exact lookup
Prefix search
Admin CRUD
Administrative sync
```

Không đưa quá nhiều bài toán vào DynamoDB ngay từ đầu.

---

# 45. Ngoài phạm vi Version 1

Không triển khai:

* Full-text search.
* Fuzzy search.
* OpenSearch.
* Geospatial index.
* Nearby search.
* Route planning.
* Distance calculation.
* Google Places synchronization.
* User trip storage.
* User image storage.
* Public place contribution không kiểm duyệt.
* Recommendation engine.

Nếu sau này cần:

```text
"quán cafe trong bán kính 3 km"
```

thì cần đánh giá riêng geospatial access pattern thay vì ép DynamoDB hiện tại xử lý.

---

# 46. Roadmap

## Phase 1: Read-only Catalog

```text
AWS SAM scaffold
        ↓
DynamoDB + GSI
        ↓
Province/Ward import
        ↓
Query Lambda
        ↓
API Gateway
        ↓
Public API
```

Bao gồm:

* Validation.
* Pagination.
* Unit test.
* Integration test.
* CORS.
* Throttling.

---

## Phase 2: Place Administration

```text
JWT Authorizer
      ↓
Admin Lambda
      ↓
CRUD Place
      ↓
Duplicate protection
      ↓
Soft delete
```

Bao gồm:

* `TransactWriteItems`.
* UNIQUE item.
* `ARCHIVED`.
* Audit timestamps.

---

## Phase 3: Automation

```text
EventBridge
     ↓
Province Sync Lambda
     ↓
Province Open API
     ↓
DynamoDB
```

Bổ sung:

* CloudWatch alarms.
* Dashboard.
* CI/CD.
* Automated deployment.
* Custom domain nếu cần.

---

## Phase 4: Nomad Diary Integration

Frontend:

```text
Province Combobox
       ↓
Ward Combobox
       ↓
Place Search/Combobox
```

Data flow:

```text
Nomad Diary FE
     │
     ├──── Public lookup ────► Location Catalog
     │
     └──── Trip mutation ────► Nomad Diary Backend
```

Nomad Diary backend:

```text
externalPlaceId
      ↓
Catalog validation
      ↓
Canonical data
      ↓
Snapshot
      ↓
RDS
```

User-created places vẫn thuộc Nomad Diary.

---

# 47. Kiến trúc cuối cùng

```text
                         EXTERNAL DATA
                              │
                    Province Open API
                              │
                              ▼
                     EventBridge Scheduler
                              │
                              ▼
                       Sync Lambda
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│                LOCATION CATALOG                         │
│                                                        │
│    API Gateway                                         │
│        │                                               │
│        ├──── Query Lambda ─────┐                       │
│        │                       │                       │
│        └──── Admin Lambda ─────┼────► DynamoDB         │
│                                │      LocationCatalog  │
└──────────────────────────────────────────────────────────┘
              ▲                         ▲
              │                         │
              │ public lookup           │ server lookup
              │                         │
        ┌─────┴─────┐           ┌──────┴──────────┐
        │ Nomad     │           │ Nomad Diary     │
        │ Diary FE  │           │ Backend         │
        │ Vue       │           │ Express / EC2   │
        └─────┬─────┘           └──────┬──────────┘
              │                        │
              │ trip operations        │
              └───────────────────────►│
                                       │
                                       ▼
                               PostgreSQL RDS
                                       │
                                       ▼
                             User / Trip / Stop /
                              Image / Snapshot
```

Boundary cuối cùng:

```text
Location Catalog
────────────────────────
"What places exist?"

Nomad Diary
────────────────────────
"Where did this user go?"
```

Đây là nguyên tắc quan trọng nhất của toàn bộ thiết kế.

Location Catalog có thể thay đổi, đồng bộ hoặc mở rộng độc lập.

Nomad Diary vẫn giữ toàn quyền sở hữu lịch sử của user và không phụ thuộc vào trạng thái hiện tại của catalog để đọc lại dữ liệu cũ.
