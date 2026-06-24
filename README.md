# AgroDesk — Tractor Dealer Intelligence Platform

> Maharashtra-first SaaS for tractor dealerships · 6 AI Agent modules · Marathi-native

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v3 |
| State | Zustand |
| Charts | Recharts |
| Backend | Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Voice/STT | Sarvam AI (Marathi) + Exotel (telephony) |
| WhatsApp | AiSensy / Interakt BSP |
| SMS | MSG91 (DLT registered) |
| AI/LLM | Anthropic Claude (claude-sonnet-4-6) |
| Queue | BullMQ + Redis |
| Storage | AWS S3 (ap-south-1) |

## Quick Start

```bash
# 1. Clone and install
git clone <repo>
cd agrodesk

# 2. Set up backend env
cp backend/.env.example backend/.env
# Fill in: ANTHROPIC_API_KEY, DATABASE_URL, EXOTEL_*, SARVAM_API_KEY, etc.

# 3. Set up database
cd backend
npx prisma db push    # apply schema
npx prisma generate   # generate client

# 4. Start everything
cd ..
./start.sh
```

Frontend → http://localhost:5173  
API → http://localhost:3001/api/health

## Modules

| Module | Name | Function |
|---|---|---|
| A | Sales Engine | Campaign builder, WhatsApp/SMS/Voice outreach, AI scripts |
| B | Used Tractor Agent | Urgency scoring, AI listings, buyer matching |
| C | Money Recovery | 4-stage escalation (gentle→firm→stern→legal) |
| D | Cold Calling Agent | Bulk upload, DLT scrub, AI voice calls via Exotel |
| E | AI Salesman | Inbound WhatsApp/web enquiry handler |
| F | AI Accountant | Monthly bill collection, OCR, Tally sync |

## Compliance (India)

- All SMS uses DLT-registered templates (TRAI TCCCPR)
- WhatsApp requires explicit opt-in (stored in `consents` table)
- TRAI quiet hours enforced: 9AM–9PM only
- Legal recovery stage requires human approval gate
- DPDP Act 2023: consent tracking, 72hr breach window

## Pricing

| Plan | Price | Calls | WhatsApp |
|---|---|---|---|
| Starter | ₹2,999/mo | 500 | 1,000 |
| Growth | ₹6,999/mo | 2,000 | 5,000 |
| Pro | ₹14,999/mo | Unlimited | Unlimited |

## Languages Supported

Marathi (default) · Hindi · English · Gujarati · Punjabi · Tamil · Telugu · Kannada · Bengali
