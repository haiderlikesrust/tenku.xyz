#!/bin/sh
set -e

mkdir -p "${STORAGE_PATH:-/data/storage}"

if [ "$(id -u)" = "0" ]; then
  chown -R nextjs:nodejs /data 2>/dev/null || true
  exec gosu nextjs "$0" "$@"
fi

cd /app

echo "Running database migrations..."
prisma migrate deploy --schema ./prisma/schema.prisma

echo "Starting Tenku..."
exec node server.js
