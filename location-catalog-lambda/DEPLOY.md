# Deploy Location Catalog Lambda

Tài liệu này mô tả quy trình thủ công để build, kiểm tra, push container image
lên Amazon ECR, tạo/cập nhật Lambda và nối Lambda với API Gateway HTTP API.

Repo hiện không có Infrastructure as Code. Các tài nguyên ECR, IAM, Lambda,
DynamoDB và API Gateway phải được tạo hoặc cấu hình bên ngoài source code.

## Giá trị đang được source code sử dụng

| Thành phần           | Giá trị                               |
| -------------------- | ------------------------------------- |
| AWS Region           | `ap-southeast-1`                      |
| DynamoDB table       | `LocationCatalog`                     |
| ECR repository       | `nomad-diary/location-catalog`        |
| Local image          | `nomad-diary/location-catalog:latest` |
| Lambda architecture  | `x86_64`                              |
| Lambda handler       | `src/handlers/query.handler`          |
| Container port       | `8080`                                |
| Local published port | `9000`                                |

Region và tên bảng đang hard-code trong
`src/repositories/location-catalog.repository.js`. `LOG_LEVEL=info` có trong
`compose.yaml`, nhưng source hiện không đọc biến này.

Tên Lambda function, execution role, API ID, stage và domain không được khai báo
trong repo; các phần dưới dùng biến hoặc placeholder cho những giá trị đó.

## Điều kiện trước khi deploy

- Docker Desktop đang chạy.
- Docker Compose và Buildx khả dụng.
- AWS CLI v2 đã được cấu hình credentials/profile.
- Principal đang dùng có quyền thao tác ECR, Lambda, IAM và API Gateway phù hợp.
- ECR repository và Lambda nằm cùng Region `ap-southeast-1`.
- Bảng `LocationCatalog`, `GSI1`, `GSI2` và dữ liệu đã tồn tại.
- Lambda execution role có quyền ghi CloudWatch Logs và đọc DynamoDB.

Kiểm tra identity trước khi chạy lệnh làm thay đổi AWS:

```powershell
$AwsRegion = "ap-southeast-1"
$EcrRepository = "nomad-diary/location-catalog"
$LocalImage = "nomad-diary/location-catalog:latest"
$LambdaFunctionName = "location-catalog"

aws sts get-caller-identity

$AwsAccountId = aws sts get-caller-identity `
  --query Account `
  --output text

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($AwsAccountId)) {
  throw "Không lấy được AWS account ID."
}

$EcrRegistry = "${AwsAccountId}.dkr.ecr.${AwsRegion}.amazonaws.com"
$ImageUri = "${EcrRegistry}/${EcrRepository}:latest"

Write-Output "Account: $AwsAccountId"
Write-Output "Region: $AwsRegion"
Write-Output "Image: $ImageUri"
```

Nếu dùng named profile, thêm `--profile <profile-name>` nhất quán vào mọi lệnh
`aws`, bao gồm cả lệnh `get-login-password`.

## 1. Kiểm tra ECR repository

```powershell
aws ecr describe-repositories `
  --repository-names $EcrRepository `
  --region $AwsRegion
```

Nếu repository chưa tồn tại, tạo một lần:

```powershell
aws ecr create-repository `
  --repository-name $EcrRepository `
  --image-scanning-configuration scanOnPush=true `
  --region $AwsRegion
```

Không chạy lệnh tạo lại nếu repository đã có.

## 2. Build image Linux AMD64

```powershell
cd D:\hub\nomad-diary\location-catalog-lambda
```

`compose.yaml` hiện khai báo:

```yaml
services:
    api:
        image: nomad-diary/location-catalog:latest
        platform: linux/amd64
        build:
            context: .
            dockerfile: Dockerfile
            platforms:
                - linux/amd64
        environment:
            LOG_LEVEL: info
        ports:
            - "9000:8080"
```

Trên môi trường Docker Compose đang dùng cho project, tắt provenance mặc định
trước khi build để image tương thích Lambda:

```powershell
$env:BUILDX_NO_DEFAULT_ATTESTATIONS = "1"
docker compose build
```

Image phải là Linux single-architecture `amd64`; Lambda không nhận
multi-architecture container image cho một function.

## 3. Kiểm tra image local

```powershell
docker images nomad-diary/location-catalog

docker image inspect $LocalImage `
  --format 'name={{index .RepoTags 0}} architecture={{.Architecture}} os={{.Os}} size={{.Size}} bytes'
```

Kết quả cần có dạng:

```text
name=nomad-diary/location-catalog:latest architecture=amd64 os=linux
```

## 4. Smoke test local

Khởi động Lambda Runtime Interface Emulator:

```powershell
docker compose up
```

Mở PowerShell khác và gọi health check:

```powershell
$eventBody = @{
  version = "2.0"
  rawPath = "/v1/health"
  requestContext = @{
    requestId = "local-health"
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

Lambda Runtime Interface Emulator trả về Lambda proxy envelope. Trường `body`
là JSON string; sau khi parse phải chứa:

```json
{
    "data": {
        "service": "location-catalog",
        "status": "ok"
    }
}
```

`/v1/health` không gọi DynamoDB. Health thành công chỉ xác nhận container và
handler chạy được.

Có thể tạo event cho route địa điểm:

```powershell
$eventBody = @{
  version = "2.0"
  rawPath = "/v1/provinces/48/wards/20242/places"
  queryStringParameters = @{
    search = "cau"
    featured = "true"
    limit = "20"
  }
  requestContext = @{
    requestId = "local-places"
    http = @{
      method = "GET"
      path = "/v1/provinces/48/wards/20242/places"
    }
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:9000/2015-03-31/functions/function/invocations" `
  -ContentType "application/json" `
  -Body $eventBody
```

Tuy nhiên, `compose.yaml` hiện không mount AWS credentials và không cấu hình
DynamoDB Local. Route dữ liệu sẽ trả `500 INTERNAL_ERROR` nếu AWS SDK trong
container không lấy được credentials, không truy cập được bảng hoặc schema/index
không đúng.

Dừng container:

```powershell
docker compose down
```

## 5. Login, tag và push lên ECR

Đăng nhập Docker vào đúng registry:

```powershell
aws ecr get-login-password --region $AwsRegion |
  docker login `
    --username AWS `
    --password-stdin $EcrRegistry
```

Tag image local bằng URI đầy đủ của ECR:

```powershell
docker tag $LocalImage $ImageUri
```

Push image:

```powershell
docker push $ImageUri
```

Kiểm tra tag đã có trên ECR:

```powershell
aws ecr describe-images `
  --repository-name $EcrRepository `
  --image-ids imageTag=latest `
  --region $AwsRegion
```

## 6. Cấu hình Lambda

### Execution role

Execution role cần trust principal `lambda.amazonaws.com`. Gắn
`AWSLambdaBasicExecutionRole` hoặc policy tương đương để ghi log.

Quyền DynamoDB tối thiểu của Query Lambda:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": ["dynamodb:GetItem", "dynamodb:Query"],
            "Resource": [
                "arn:aws:dynamodb:ap-southeast-1:AWS_ACCOUNT_ID:table/LocationCatalog",
                "arn:aws:dynamodb:ap-southeast-1:AWS_ACCOUNT_ID:table/LocationCatalog/index/*"
            ]
        }
    ]
}
```

Thay `AWS_ACCOUNT_ID` bằng account thực tế. Source không cần quyền ghi
DynamoDB.

### Tạo function lần đầu

Đặt ARN của execution role đã tạo:

```powershell
$ExecutionRoleArn = "arn:aws:iam::${AwsAccountId}:role/<lambda-execution-role>"
```

Sau khi thay placeholder role name:

```powershell
aws lambda create-function `
  --function-name $LambdaFunctionName `
  --package-type Image `
  --code "ImageUri=$ImageUri" `
  --role $ExecutionRoleArn `
  --architectures x86_64 `
  --region $AwsRegion
```

Timeout, memory, reserved concurrency và log retention chưa được quy định trong
repo; cấu hình chúng theo môi trường triển khai.

### Cập nhật function đã tồn tại

```powershell
aws lambda update-function-code `
  --function-name $LambdaFunctionName `
  --image-uri $ImageUri `
  --region $AwsRegion
```

Push lại tag `latest` lên ECR **không tự cập nhật Lambda**. Lambda resolve tag
thành image digest tại thời điểm deploy, vì vậy mỗi lần push image mới vẫn phải
chạy `update-function-code`.

Kiểm tra trạng thái update:

```powershell
aws lambda get-function-configuration `
  --function-name $LambdaFunctionName `
  --query '{State:State,LastUpdateStatus:LastUpdateStatus,RevisionId:RevisionId}' `
  --region $AwsRegion
```

Chỉ tiếp tục khi `State` là `Active` và `LastUpdateStatus` là
`Successful`.

## 7. Cấu hình API Gateway HTTP API

Tạo một Lambda proxy integration trỏ đến function trên với payload format
version `2.0`. Handler đọc `rawPath`,
`requestContext.http.method` và `queryStringParameters` của format này.

Năm route phải trỏ đến cùng integration:

```text
GET /v1/health
GET /v1/provinces
GET /v1/provinces/{provinceCode}/wards
GET /v1/provinces/{provinceCode}/wards/{wardCode}/places
GET /v1/provinces/{provinceCode}/places/{placeId}
```

API Gateway phải có quyền invoke Lambda. Khi tạo integration bằng AWS Console,
Console thường tạo permission tương ứng; nếu cấu hình bằng CLI/IaC thì phải kiểm
tra resource-based policy của function.

Nếu frontend gọi Catalog API trực tiếp, cấu hình CORS ở API Gateway cho đúng
frontend origin, method `GET` và các header cần thiết. Handler không tự thêm
CORS header.

Nếu stage không bật auto-deploy, deploy lại stage sau khi tạo hoặc sửa route.

## 8. Kiểm tra sau deploy

### Gọi Lambda trực tiếp

```powershell
$payload = @{
  version = "2.0"
  rawPath = "/v1/health"
  requestContext = @{
    requestId = "deploy-health"
    http = @{
      method = "GET"
      path = "/v1/health"
    }
  }
} | ConvertTo-Json -Depth 5 -Compress

aws lambda invoke `
  --function-name $LambdaFunctionName `
  --cli-binary-format raw-in-base64-out `
  --payload $payload `
  --region $AwsRegion `
  response.json

Get-Content -Raw -Encoding UTF8 response.json
```

### Gọi qua API Gateway

```powershell
$ApiBaseUrl = "https://<api-id>.execute-api.ap-southeast-1.amazonaws.com"

Invoke-RestMethod `
  -Method Get `
  -Uri "$ApiBaseUrl/v1/health"
```

Sau health check, gọi ít nhất:

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "$ApiBaseUrl/v1/provinces"
```

Health có thể thành công trong khi route dữ liệu thất bại. Nếu route dữ liệu trả
`500`, kiểm tra CloudWatch Logs, execution role, tên bảng, Region, key schema,
`GSI1`, `GSI2` và dữ liệu `ACTIVE`.

## 9. Chu kỳ deploy bản cập nhật

Mỗi lần source thay đổi:

1. Chạy syntax check và các test hiện có.
2. Build lại image `linux/amd64`.
3. Smoke test `/v1/health` ở local.
4. Tag và push image lên ECR.
5. Chạy `aws lambda update-function-code`.
6. Chờ `LastUpdateStatus = Successful`.
7. Kiểm tra health và ít nhất một route DynamoDB qua API Gateway.

Module hiện không có automated test, script deploy hay rollback. Giữ lại image
tag/digest ổn định nếu cần quay về phiên bản trước; không chỉ phụ thuộc vào
`latest`.

## Tài liệu AWS tham khảo

- [Create a Lambda function using a container image](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)
- [Push a Docker image to Amazon ECR](https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html)
- [Lambda proxy integrations for API Gateway HTTP APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html)
