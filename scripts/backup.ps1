$fecha = Get-Date -Format "yyyyMMdd-HHmmss"
$destino = Join-Path "backups" $fecha
New-Item -ItemType Directory -Force -Path $destino | Out-Null
docker compose exec -T postgres pg_dump -U simplytemplate simplytemplate | Set-Content -Encoding utf8 (Join-Path $destino "postgres.sql")
docker compose exec -T mongo mongodump --archive --db simplytemplate | Set-Content -Encoding byte (Join-Path $destino "mongo.archive")
Write-Output "Respaldo en $destino"
