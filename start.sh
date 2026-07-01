#!/bin/bash
# AgroDesk - Start all services

echo "🚜 Starting AgroDesk..."
echo ""

# Check for .env
if [ ! -f backend/.env ]; then
  echo "⚠️  No backend/.env found. Copy from backend/.env.example and fill in API keys."
  echo "   cp backend/.env.example backend/.env"
  echo ""
fi

# Terminal 1: Backend API
echo "Starting backend on :3001..."
(cd backend && npm run dev) &

# Terminal 2: Agent worker (places real calls/WhatsApp/SMS — without this,
# jobs queue up in Postgres/Redis but nothing ever actually goes out)
echo "Starting agent worker..."
(cd backend && npm run dev:worker) &

# Terminal 3: Frontend
echo "Starting frontend on :5173..."
(c