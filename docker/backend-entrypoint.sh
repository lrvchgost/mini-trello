#!/bin/sh
# Applies pending Prisma migrations, idempotently seeds the demo data and
# starts the API. Seed uses `upsert`, so container restarts are safe.
set -eu

cd /app/apps/backend

echo "[entrypoint] applying database migrations..."
prisma migrate deploy

echo "[entrypoint] seeding demo data..."
prisma db seed

echo "[entrypoint] starting api on port ${PORT:-3000}..."
exec node dist/main.js
