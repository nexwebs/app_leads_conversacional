# Project Agents

This document describes the project structure and patterns for AI agents.

## Project Overview

CRM Multi-Agent Lead Management System with:
- **Backend**: FastAPI (Python) with PostgreSQL + pgvector
- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Auth**: JWT-based authentication
- **Database**: Neon (PostgreSQL with vector support)

## Directory Structure

```
server-leads-agent/
├── app/                    # Backend FastAPI app
│   ├── api/               # API routes (auth, leads, chat, vendedor)
│   ├── models/            # SQLAlchemy models
│   ├── schemas/           # Pydantic schemas
│   ├── services/         # Business logic (database, embeddings, email)
│   ├── middleware/        # Security (rate limiting, CORS)
│   └── config.py          # Settings
├── crm/                   # Frontend React app
│   ├── src/
│   │   ├── pages/        # Page components (Login, Dashboard, Leads, etc.)
│   │   ├── context/      # React contexts (AuthContext)
│   │   ├── services/     # API layer (api.ts)
│   │   └── App.tsx       # Routing
│   └── vite.config.ts    # Vite config (port 5174)
└── .env                   # Environment variables
```

## Key Patterns

### Backend
- All endpoints use `get_current_active_user` dependency for auth
- Leads: `/api/v1/leads/` - CRUD operations
- Vendedores: `/api/v1/leads/vendedores` - list users
- Chat history: `/api/v1/leads/{id}/conversaciones`

### Frontend
- Uses axios with interceptors for JWT token
- AuthContext handles login/logout state
- All API calls go through `services/api.ts`

## Credentials
- Email: admin@empresa.com
- Password: admin123

## Running the App

Backend (port 8000):
```bash
uv run uvicorn app.main:app --reload --port 8000
```

Frontend (port 5174):
```bash
cd crm && npm run dev
```
