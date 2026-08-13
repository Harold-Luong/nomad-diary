# Location Catalog infrastructure

Thư mục này chứa utility tạo và kiểm tra schema DynamoDB. Lambda runtime không
tự tạo table.

## Cấu hình

PowerShell, AWS DynamoDB tại Singapore:

```powershell
$env:AWS_REGION = "ap-southeast-1"
$env:TABLE_NAME = "LocationCatalog"
```

Nếu chạy với DynamoDB Local, bổ sung:

```powershell
$env:DYNAMODB_ENDPOINT = "http://localhost:8000"
```

Không đặt AWS access key hoặc secret key trong source hay file environment.
Khi không có `DYNAMODB_ENDPOINT`, AWS SDK sử dụng credential provider chain của
AWS CLI.

## Tạo hoặc kiểm tra table

```powershell
npm.cmd run dynamodb:migrate
```

Migration sẽ:

1. Tạo table nếu chưa tồn tại.
2. Chờ table chuyển sang `ACTIVE`.
3. Kiểm tra `PK`, `SK`, `GSI1`, `GSI2` và billing mode.
4. Dừng với lỗi nếu table tồn tại nhưng schema không đúng.

## Chỉ kiểm tra schema

```powershell
npm.cmd run dynamodb:verify
```

Lệnh verify không tạo hoặc cập nhật table.
