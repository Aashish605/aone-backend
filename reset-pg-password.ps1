# Run this script as Administrator
Write-Host "=== Resetting PostgreSQL 18 password ===" -ForegroundColor Cyan

$pgData = "C:\Program Files\PostgreSQL\18\data"
$pgHba = "$pgData\pg_hba.conf"
$backup = "$pgHba.backup"

# 1. Stop the service
Write-Host "[1/5] Stopping PostgreSQL service..." -ForegroundColor Yellow
net stop postgresql-x64-18
if ($LASTEXITCODE -ne 0) { exit 1 }

# 2. Backup and edit pg_hba.conf (set BOTH IPv4 and IPv6 to trust)
Write-Host "[2/5] Editing pg_hba.conf to allow trust auth..." -ForegroundColor Yellow
Copy-Item -Path $pgHba -Destination $backup -Force
(Get-Content $pgHba) |
  ForEach-Object { $_ -replace '^(host\s+all\s+all\s+(127\.0\.0\.1/32|::1/128)\s+)scram-sha-256', '$1trust' } |
  Set-Content $pgHba

# 3. Start the service
Write-Host "[3/5] Starting PostgreSQL service..." -ForegroundColor Yellow
net start postgresql-x64-18
if ($LASTEXITCODE -ne 0) { exit 1 }

# 4. Reset password (use IPv4 explicitly to avoid ::1 resolution issues)
Write-Host "[4/5] Resetting postgres user password..." -ForegroundColor Yellow
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host "Password set to: postgres" -ForegroundColor Green

# 5. Stop, restore config, and restart
Write-Host "[5/5] Restoring pg_hba.conf and restarting..." -ForegroundColor Yellow
net stop postgresql-x64-18
Copy-Item -Path $backup -Destination $pgHba -Force
net start postgresql-x64-18

Write-Host ""
Write-Host "=== Done! New credentials ===" -ForegroundColor Cyan
Write-Host "  User:     postgres"
Write-Host "  Password: postgres"
Write-Host "  Host:     localhost"
Write-Host "  Port:     5432"
Write-Host ""
Write-Host "Update your .env file with:" -ForegroundColor Yellow
Write-Host "  DB_USER=postgres"
Write-Host "  DB_PASSWORD=postgres"
