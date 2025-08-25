#!/bin/sh
set -e

echo "⏳ Waiting for Postgres at $PGHOST:$PGPORT ..."
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" >/dev/null 2>&1; do
  sleep 1
done
echo "✅ Postgres is ready."

# Optional: Health ping der DB (einfache Query)
# PGPASSWORD env wird von Compose gesetzt:
psql "postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}" -c "SELECT 1;" >/dev/null

echo "🚀 Starting backend on port ${PORT:-5000}"
node server.js
