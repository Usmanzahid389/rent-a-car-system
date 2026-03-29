# Rent-a-car vehicle booking system

Admin-only dashboard for managing customers, vehicles, and bookings. Backend: **Express**, **Prisma**, **MySQL**. Frontend: **Vite**, **React**, **TypeScript**.

## Prerequisites

- Node.js 20+
- Docker (for MySQL) or a local MySQL 8 instance

## 1. Start MySQL

From the repo root:

```bash
docker compose up -d
```

Wait until MySQL is healthy (about 10–20 seconds).

## 2. Backend

```bash
cd backend
cp .env.example .env
# Default DATABASE_URL matches docker-compose (user uz, password rentacar, database rentacar)
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

API: [http://localhost:4000](http://localhost:4000) — health check: `GET /health`.

Seeded admin (from seed): **admin@example.com** / **admin123**

## 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App: [http://localhost:5173](http://localhost:5173)

Set `VITE_API_URL` in `frontend/.env` if the API is not on `http://localhost:4000`.

## Environment variables

| Location | Variable | Purpose |
|----------|----------|---------|
| `backend/.env` | `DATABASE_URL` | MySQL connection string |
| `backend/.env` | `JWT_SECRET` | Signing key for JWTs |
| `backend/.env` | `PORT` | API port (default 4000) |
| `backend/.env` | `FRONTEND_URL` | CORS origin (default http://localhost:5173) |
| `frontend/.env` | `VITE_API_URL` | Base URL of the API |

## API summary

- `POST /api/auth/register`, `POST /api/auth/login` — public
- `GET/POST /api/customers`, `GET/PATCH/DELETE /api/customers/:id` — JWT required
- `GET/POST /api/vehicles`, `GET/PATCH/DELETE /api/vehicles/:id` — JWT required
- `GET/POST /api/bookings`, `GET/PATCH/DELETE /api/bookings/:id` — JWT required
- `GET /api/dashboard/stats` — JWT required; returns `totalBookings` (non-cancelled count) and `totalRevenue` (sum of **confirmed** bookings)

## Workspace scripts

From the repo root after `npm install`:

- `npm run dev:backend` — run API in dev mode
- `npm run dev:frontend` — run Vite dev server
