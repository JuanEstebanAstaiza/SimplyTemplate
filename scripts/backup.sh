#!/bin/sh
set -eu
fecha=$(date +%Y%m%d-%H%M%S)
destino="backups/$fecha"
mkdir -p "$destino"
docker compose exec -T postgres pg_dump -U simplytemplate simplytemplate > "$destino/postgres.sql"
docker compose exec -T mongo mongodump --archive --db simplytemplate > "$destino/mongo.archive"
echo "Respaldo en $destino"
