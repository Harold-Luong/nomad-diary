# Deploy Location Catalog Lambda

Quy trình thủ công để build container, push Amazon ECR, tạo/cập nhật Lambda và
nối API Gateway HTTP API. Repo chưa có Infrastructure as Code; mọi lệnh AWS phải
được kiểm tra đúng account/region trước khi chạy.

## Phạm vi và giá trị hiện tại

| Thành phần | Giá trị |
| --- | --- |
| AWS Region | `ap-southeast-1` |
| DynamoDB table | `LocationCatalog` |
| ECR repository | `nomad-diary/location-catalog` |
| Local image | `nomad-diary/location-catalog:latest` |
| Lambda architecture | `x86_64` |
| Handler | `src/handlers/query.handler` |
| Container/local port | `8080` / `9000` |

Region/table đang hard-code trong repository source. Tên function, role, API,
stage và domain là cấu hình hạ tầng bên ngoài repo.

## Điều kiện trước khi deploy

- Docker, Compose và Buildx hoạt động.
- AWS CLI v2 đã đăng nhập đúng profile.
- Principal có quyền ECR/Lambda/IAM/API Gateway cần thiết.
- ECR và Lambda ở `ap-southeast-1`.
- `LocationCatalog`, `GSI1`, `GSI2` và dữ liệu đã tồn tại.
- Lambda execution role ghi được CloudWatch Logs và đọc DynamoDB.
- Source đã commit hoặc có image tag truy vết được.

## Khai báo biến triển khai

Chạy trong shell từ thư mục `location-catalog-lambda`:

```bash
AWS_REGION="ap-southeast-1"
ECR_REPOSITORY="nomad-diary/location-catalog"
LOCAL_IMAGE="nomad-diary/location-catalog:latest"
LAMBDA_FUNCTION_NAME="location-catalog"
IMAGE_TAG="$(git rev-parse --short HEAD)"

aws sts get-caller-identity
AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_URI="${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"

printf 'Account: %s\nRegion: %s\nImage: %s\n' \
  "$AWS_ACCOUNT_ID" "$AWS_REGION" "$IMAGE_URI"
```

Nếu dùng named profile, thêm `--profile <profile-name>` nhất quán vào mọi lệnh
`aws`, kể cả login ECR. Không tiếp tục nếu identity/account không đúng.

## 1. Kiểm tra ECR repository

```bash
aws ecr describe-repositories \
  --repository-names "$ECR_REPOSITORY" \
  --region "$AWS_REGION"
```

Chỉ tạo nếu chưa tồn tại:

```bash
aws ecr create-repository \
  --repository-name "$ECR_REPOSITORY" \
  --image-scanning-configuration scanOnPush=true \
  --region "$AWS_REGION"
```

## 2. Kiểm tra source

```bash
npm ci
find src -name '*.js' -print0 | xargs -0 -n1 node --check
```

Module chưa có automated test. Syntax check không thay thế smoke test hoặc test
DynamoDB.

## 3. Build image Linux AMD64

```bash
BUILDX_NO_DEFAULT_ATTESTATIONS=1 docker compose build
```

`compose.yaml` đặt platform `linux/amd64`. Lambda function chỉ nhận một
architecture, không dùng multi-architecture manifest.

Kiểm tra image:

```bash
docker image inspect "$LOCAL_IMAGE" \
  --format 'name={{index .RepoTags 0}} architecture={{.Architecture}} os={{.Os}} size={{.Size}}'
```

Kết quả cần có `architecture=amd64 os=linux`.

## 4. Smoke test local

Khởi động Runtime Interface Emulator:

```bash
docker compose up
```

Từ terminal khác:

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

Lambda proxy envelope phải có `statusCode: 200`; JSON string trong `body`
chứa:

```json
{
  "data": {
    "service": "location-catalog",
    "status": "ok"
  }
}
```

Health không gọi DynamoDB. Compose không mount AWS credentials hoặc DynamoDB
Local, vì vậy route data chỉ thành công nếu container được cấp credential và
network phù hợp.

Dừng container:

```bash
docker compose down
```

## 5. Login và push ECR

```bash
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

docker tag "$LOCAL_IMAGE" "$IMAGE_URI"
docker push "$IMAGE_URI"
```

Kiểm tra image:

```bash
aws ecr describe-images \
  --repository-name "$ECR_REPOSITORY" \
  --image-ids "imageTag=$IMAGE_TAG" \
  --region "$AWS_REGION"
```

Dùng tag bất biến theo commit/release thay vì chỉ `latest` để audit và rollback.

## 6. Execution role

Trust policy phải cho `lambda.amazonaws.com` assume role. Gắn
`AWSLambdaBasicExecutionRole` hoặc quyền log tương đương.

Policy DynamoDB tối thiểu:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:ap-southeast-1:<account-id>:table/LocationCatalog",
        "arn:aws:dynamodb:ap-southeast-1:<account-id>:table/LocationCatalog/index/*"
      ]
    }
  ]
}
```

Không cấp Scan hoặc quyền ghi vì source không dùng.

## 7. Tạo hoặc cập nhật Lambda

### Tạo lần đầu

```bash
EXECUTION_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/<lambda-execution-role>"

aws lambda create-function \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --package-type Image \
  --code "ImageUri=$IMAGE_URI" \
  --role "$EXECUTION_ROLE_ARN" \
  --architectures x86_64 \
  --region "$AWS_REGION"
```

Timeout, memory, reserved concurrency và log retention phải được quyết định theo
môi trường; repo chưa quy định giá trị.

### Cập nhật function

```bash
aws lambda update-function-code \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --image-uri "$IMAGE_URI" \
  --region "$AWS_REGION"
```

Push ECR không tự cập nhật Lambda. Lambda resolve tag thành digest tại thời điểm
update.

Chờ hoàn tất:

```bash
aws lambda wait function-updated-v2 \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --region "$AWS_REGION"

aws lambda get-function-configuration \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --query '{State:State,LastUpdateStatus:LastUpdateStatus,RevisionId:RevisionId}' \
  --region "$AWS_REGION"
```

Chỉ tiếp tục khi `State=Active` và `LastUpdateStatus=Successful`.

## 8. API Gateway HTTP API

Tạo Lambda proxy integration với payload format `2.0`. Tất cả route trỏ tới
cùng function:

```text
GET /v1/health
GET /v1/provinces
GET /v1/provinces/{provinceCode}/wards
GET /v1/provinces/{provinceCode}/wards/{wardCode}/places
GET /v1/provinces/{provinceCode}/places/{placeId}
```

Handler đọc `rawPath`, `requestContext.http.method` và
`queryStringParameters`. API Gateway cần permission invoke Lambda.

Nếu frontend gọi trực tiếp:

- cho phép đúng frontend origin;
- method `GET`;
- header `Accept` cần thiết;
- deploy lại stage nếu auto-deploy tắt.

Handler không tự thêm CORS header.

## 9. Kiểm tra sau deploy

### Invoke Lambda trực tiếp

```bash
aws lambda invoke \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --cli-binary-format raw-in-base64-out \
  --payload '{
    "version":"2.0",
    "rawPath":"/v1/health",
    "requestContext":{
      "requestId":"deploy-health",
      "http":{"method":"GET","path":"/v1/health"}
    }
  }' \
  --region "$AWS_REGION" \
  /tmp/location-catalog-response.json

sed -n '1,120p' /tmp/location-catalog-response.json
```

### Qua API Gateway/custom domain

```bash
CATALOG_BASE_URL="https://<api-domain>"

curl --fail-with-body "$CATALOG_BASE_URL/v1/health"
curl --fail-with-body "$CATALOG_BASE_URL/v1/provinces"
```

Health thành công không chứng minh quyền DynamoDB. Nếu route provinces lỗi
`500`, kiểm tra CloudWatch Logs, role, region/table, key schema, GSI và item
`ACTIVE`.

## Rollback

Giữ image tag/digest của bản đã ổn định. Rollback code bằng cách cập nhật Lambda
về URI image cũ:

```bash
PREVIOUS_IMAGE_URI="<registry>/<repository>:<previous-tag>"

aws lambda update-function-code \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --image-uri "$PREVIOUS_IMAGE_URI" \
  --region "$AWS_REGION"
```

Chờ function updated rồi chạy lại cả health và route DynamoDB. Nếu thay đổi liên
quan schema/data, rollback image có thể không đủ.

## Checklist mỗi release

- [ ] AWS identity và region đúng.
- [ ] Source/syntax check thành công.
- [ ] Image `linux/amd64` build thành công.
- [ ] Local health smoke test thành công.
- [ ] Image dùng tag truy vết được và đã scan/push ECR.
- [ ] Lambda update hoàn tất.
- [ ] API Gateway health thành công.
- [ ] Ít nhất một route DynamoDB thành công.
- [ ] CloudWatch Logs không có lỗi mới.
- [ ] Ghi nhận image URI/digest để rollback.

## Tài liệu liên quan

- [Location Catalog](README.md)
- [Tổng quan repository](../README.md)
- [Mục lục tài liệu](../docs/README.md)
