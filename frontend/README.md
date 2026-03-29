# Frontend — Rent-a-car admin

Vite + React + TypeScript SPA for the admin dashboard (login, customers, vehicles, bookings, overview stats).

Full setup (MySQL, API, env) is documented in the [**repository root README**](../README.md).

## Quick start

From this folder:

```bash
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The API must be running (default [http://localhost:4000](http://localhost:4000)).

## Configuration

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Base URL of the backend API (default `http://localhost:4000`) |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | ESLint |
