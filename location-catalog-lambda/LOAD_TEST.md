# Bounded API load test

Script này dùng để kiểm tra throttling và thời gian phản hồi của Location Catalog
API. Nó chỉ gửi request `GET`, không follow redirect và chỉ chấp nhận domain
`locations-api.nomad-diary.site` hoặc loopback.

Giới hạn cứng:

- Tối đa 200 request cho mỗi lần chạy.
- Tối đa 10 worker đồng thời.
- Tối đa 20 request/giây.
- Timeout tối đa 10 giây cho mỗi request.

Chạy nhẹ để kiểm tra API:

```powershell
npm.cmd run test:load -- --requests 20 --concurrency 2 --rps 5
```

Kiểm tra throttling `10 request/giây` bằng tải cao hơn giới hạn một chút:

```powershell
npm.cmd run test:load -- --requests 100 --concurrency 10 --rps 20
```

Khi throttling hoạt động, kết quả sẽ có response `HTTP 429`. Theo dõi đồng thời
API Gateway `Count`, `4XXError`, `Latency` và Lambda `Invocations`, `Throttles`,
`ConcurrentExecutions` trong CloudWatch.

Xem toàn bộ tùy chọn:

```powershell
npm.cmd run test:load -- --help
```
