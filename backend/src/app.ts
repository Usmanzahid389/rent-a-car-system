import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import customerRoutes from "./routes/customers.js";
import vehicleRoutes from "./routes/vehicles.js";
import bookingRoutes from "./routes/bookings.js";
import dashboardRoutes from "./routes/dashboard.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();

const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);

app.use("/api/customers", requireAuth as express.RequestHandler, customerRoutes);
app.use("/api/vehicles", requireAuth as express.RequestHandler, vehicleRoutes);
app.use("/api/bookings", requireAuth as express.RequestHandler, bookingRoutes);
app.use("/api/dashboard", requireAuth as express.RequestHandler, dashboardRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
