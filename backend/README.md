# Backend — Rent-a-car API

Express + Prisma + MySQL REST API: JWT admin auth, CRUD for customers, vehicles, bookings, and dashboard stats.

Setup, `DATABASE_URL`, migrations, and seed are documented in the [**repository root README**](../README.md).

## Quick start

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed   # optional: default admin user
npm run dev
```

API listens on `PORT` (default **4000**). Health: `GET /health`.
