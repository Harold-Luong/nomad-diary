# Location Catalog infrastructure

Thư mục này chứa utility tạo và kiểm tra schema DynamoDB. Lambda runtime không
tự tạo table.

## Cấu hình cố định

```text
Region: ap-southeast-1
Table:  LocationCatalog
```

Không sử dụng environment variable cho Region hoặc table name. Không đặt AWS
access key hoặc secret key trong source. AWS SDK sử dụng credential provider
chain của AWS CLI.

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

## Import Province và Ward

Importer lấy dữ liệu từ:

```text
https://provinces.open-api.vn/api/v2/?depth=2
```

Chạy:

```powershell
npm.cmd run dynamodb:import:provinces
```

Importer kiểm tra schema trước, chuẩn hóa Province/Ward, ghi tối đa 25 item mỗi
batch và retry `UnprocessedItems`. Importer chỉ upsert, không xóa record hiện có
khi upstream thiếu dữ liệu.
