import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/stats", async (_req, res, next) => {
  try {
    const [totalBookings, revenueAgg] = await Promise.all([
      prisma.booking.count({ where: { status: { not: "cancelled" } } }),
      prisma.booking.aggregate({
        where: { status: "confirmed" },
        _sum: { totalPrice: true },
      }),
    ]);
    const totalRevenue = revenueAgg._sum.totalPrice?.toString() ?? "0";
    res.json({ totalBookings, totalRevenue });
  } catch (e) {
    next(e);
  }
});

export default router;
