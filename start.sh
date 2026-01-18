#!/bin/sh
set -e

# Replace localhost with host.docker.internal in DATABASE_URL if running in Docker
if echo "$DATABASE_URL" | grep -q "localhost"; then
  echo "🔄 Detected localhost in DATABASE_URL. Replacing with host.docker.internal for Docker compatibility..."
  export DATABASE_URL=$(echo $DATABASE_URL | sed 's/localhost/host.docker.internal/g')
fi

echo "Running database migrations..."
npx prisma migrate deploy

if [ "$RUN_SEED" = "true" ]; then
    echo "🌱 Seeding database..."
    node prisma/seed.js
fi

echo "Starting the application..."
exec "$@"