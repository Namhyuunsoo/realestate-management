# quick_test.ps1
$USER_EMAIL = "darkbirth1@gmail.com"

Write-Host "1) 고객 생성"
$customer = curl -s -X POST http://127.0.0.1:53000/api/customers `
  -H "X-User: $USER_EMAIL" -H "Content-Type: application/json" `
  -d '{"name":"A고객","phone":"010-1111-2222","region":"부천시"}'
Write-Host $customer
$customerId = ($customer -split '"id":')[1] -split '"' | Select-Object -Index 1
Write-Host "생성된 고객 ID = $customerId"

Write-Host "`n2) 브리핑 생성"
$briefing = curl -s -X POST http://127.0.0.1:53000/api/briefings `
  -H "X-User: $USER_EMAIL" -H "Content-Type: application/json" `
  -d "{\"customer_id\":\"$customerId\",\"listing_ids\":[\"lst_000001\",\"lst_000002\"]}"
Write-Host $briefing
$briefingId = ($briefing -split '"id":')[1] -split '"' | Select-Object -Index 1
Write-Host "생성된 브리핑 ID = $briefingId"

Write-Host "`n3) Override (월세 -> 조정가능)"
curl -s -X POST http://127.0.0.1:53000/api/briefings/$briefingId/listing/lst_000001/override `
  -H "X-User: $USER_EMAIL" -H "Content-Type: application/json" `
  -d '{"field":"월세","value":"조정가능"}'

Write-Host "`n4) Tag (blue)"
curl -s -X POST http://127.0.0.1:53000/api/briefings/$briefingId/listing/lst_000001/tag `
  -H "X-User: $USER_EMAIL" -H "Content-Type: application/json" `
  -d '{"tag":"blue"}'

Write-Host "`n5) 최종 브리핑 조회"
curl -s -H "X-User: $USER_EMAIL" http://127.0.0.1:53000/api/briefings/$briefingId
