$body = @{
    name="Kamal"
    email="kamal@example.com"
    message="Hey! Please contact me about training."
  } | ConvertTo-Json
  
  Invoke-RestMethod -Method POST -Uri "http://localhost:7071/api/contact" `
    -ContentType "application/json" -Body $body
  