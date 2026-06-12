#!/bin/bash
# AgroDesk — First-time setup
# Run from: agrodesk/backend/

set -e

echo "=== AgroDesk Backend Setup ==="

# 1. Check Postgres running
if ! pg_isready -q 2>/dev/null; then
  echo "ERROR: PostgreSQL not running. Start with:"
  echo "  macOS: brew services start postgresql@15"
  echo "  Linux: sudo systemctl start postgresql"
  exit 1
fi

# 2. Create DB if not exists
psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='agrodesk'" | grep -q 1 \
  || psql -U postgres -c "CREATE DATABASE agrodesk;"
echo "DB: agrodesk ready"

# 3. Write .env if missing
if [ ! -f .env ]; then
  cat > .env << 'ENV'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/agrodesk"
ANTHROPIC_API_KEY="your-anthropic-api-key-here"
PORT=3001
NODE_ENV=development
# Optional (for production agents):
# EXOTEL_API_KEY=
# EXOTEL_API_TOKEN=
# EXOTEL_SID=
# EXOTEL_PHONE=
# SARVAM_API_KEY=
# WHATSAPP_TOKEN=
# WHATSAPP_PHONE_ID=
ENV
  echo ".env created — add your ANTHROPIC_API_KEY"
else
  echo ".env already exists"
fi

# 4. Install deps
echo "Installing dependencies..."
npm install

# 5. Generate Prisma client + migrate
echo "Running migrations..."
npx prisma generate
npx prisma migrate dev --name init

# 6. Seed
echo "Seeding demo data..."
npm run db:seed

echo ""
echo "=== Setup complete ==="
echo "Start backend: npm run dev"
echo "Backend URL:   http://localhost:3001"
echo "Health check:  curl http://localhost:3001/api/health"
echo "Prisma Studio: npm run db:studio"
