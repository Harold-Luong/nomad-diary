# Deploy Location Catalog Lambda

Tài liệu này hướng dẫn deploy từng bước để dễ theo dõi và kiểm tra.

## Bước 1: Tạo ECR repository

ECR repository đã được tạo trên AWS Console:

```text
nomad-diary/location-catalog
```

Region:

```text
ap-southeast-1
```

## Bước 2: Build Docker image

Mở PowerShell và chuyển vào thư mục project:

```powershell
cd D:\hub\nomad-diary\location-catalog-lambda
```

Các thông số build được khai báo trong `compose.yaml`:

```yaml
services:
  api:
    image: location-catalog:latest
    platform: linux/amd64
    build:
      context: .
      dockerfile: Dockerfile
      platforms:
        - linux/amd64
```

Docker Compose `v2.34.0` trên máy chưa hỗ trợ thuộc tính
`build.provenance` trong `compose.yaml`. Trước khi build, đặt biến Buildx để
tắt provenance mặc định:

```powershell
$env:BUILDX_NO_DEFAULT_ATTESTATIONS = "1"
docker compose build
```

Ý nghĩa cấu hình:

```text
image                       Đặt tên image local là location-catalog:latest
platform                    Chạy container bằng Linux AMD64
build.context               Dùng thư mục hiện tại làm build context
build.dockerfile            Dùng file Dockerfile
build.platforms             Build image tương ứng Lambda x86_64
environment                 Khai báo biến môi trường của container
ports                       Map cổng 9000 local vào cổng 8080 của Lambda image
BUILDX_NO_DEFAULT_ATTESTATIONS
                             Tắt provenance mặc định để tương thích Lambda
```

## Bước 3: Kiểm tra image local

Liệt kê image vừa build:

```powershell
docker images location-catalog
```

Kiểm tra hệ điều hành và kiến trúc:

```powershell
docker image inspect location-catalog:latest `
  --format 'name={{index .RepoTags 0}} architecture={{.Architecture}} os={{.Os}} size={{.Size}} bytes'
```

Kết quả cần có:

```text
name=location-catalog:latest
architecture=amd64
os=linux
```

Khi tạo Lambda trên AWS Console sau này, chọn architecture:

```text
x86_64
```

Image local sau bước này chưa được push lên ECR.

## Chạy API local

Khởi động Lambda container chứa toàn bộ Location Catalog API:

```powershell
docker compose up
```

Mở một PowerShell khác và gọi Lambda Runtime Interface Emulator:

```powershell
$eventBody = '{"version":"2.0","rawPath":"/v1/health"}'

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
