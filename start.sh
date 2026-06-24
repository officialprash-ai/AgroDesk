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

# Terminal 1: Backend
echo "Starting backend on :3001..."
(cd backend && npm run dev) &

# Terminal 2: Frontend
echo "Starting frontend on :5173..."
(cd frontend && npm run dev) &

echo ""
echo "✅ AgroDesk running:"
echo "   Frontend: http://localhost:5173"
echo "   API:      http://localhost:3001/api/health"
echo ""
echo "Press Ctrl+C to stop both services"
wait
