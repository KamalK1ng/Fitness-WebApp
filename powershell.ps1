
# $base = "https://red-dune-0acbc5d03.3.azurestaticapps.net"
# $body = @{ name="Kamal"; email="test@example.com"; message="Live test" } | ConvertTo-Json
# Invoke-RestMethod -Method POST -Uri "$base/api/contact" -ContentType "application/json" -Body $body

# git add .github/workflows
# git commit -m "fix: SWA workflow paths and skip frontend build"
# git push



git add powershell.ps1
git commit -m "chore: update local ISE helper"
git push

