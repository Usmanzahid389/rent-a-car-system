import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { findOverlappingBooking } from "../lib/bookingOverlap.js";
const router = Router();

const bookingStatus = z.enum(["pending", "confirmed", "cancelled"]);

const createSchema = z.object({
  customerId: z.string().min(1),
  vehicleId: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  totalPrice: z.union([z.number().nonnegative(), z.string()]).transform((v) => new Prisma.Decimal(String(v))),
  status: bookingStatus.optional(),
});

const updateSchema = z.object({
  customerId: z.string().min(1).optional(),
  vehicleId: z.string().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  totalPrice: z
    .union([z.number().nonnegative(), z.string()])
    .optional()
    .transform((v) => (v === undefined ? undefined : new Prisma.Decimal(String(v)))),
  status: bookingStatus.optional(),
});

function serializeBooking(b: {
  id: string;
  customerId: string;
  vehicleId: string;
  startDate: Date;
  endDate: Date;
  totalPrice: Prisma.Decimal;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...b,
    totalPrice: b.totalPrice.toString(),
  };
}

router.get("/", async (_req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
      },
    });
    res.json(
      bookings.map((b) => ({
        ...serializeBooking(b),
        customer: b.customer,
        vehicle: b.vehicle,
      }))
    );
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        vehicle: true,
      },
    });
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    res.json({
      ...serializeBooking(booking),
      customer: booking.customer,
      vehicle: {
        ...booking.vehicle,
        dailyRate: booking.vehicle.dailyRate.toString(),
      },
    });
  } catch (e) {
    next(e);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }
    const { customerId, vehicleId, startDate, endDate, totalPrice, status } = parsed.data;
    if (startDate >= endDate) {
      res.status(400).json({ error: "startDate must be before endDate" });
      return;
    }
    const [customer, vehicle] = await Promise.all([
      prisma.customer.findUnique({ where: { id: customerId } }),
      prisma.vehicle.findUnique({ where: { id: vehicleId } }),
    ]);
    if (!customer) {
      res.status(400).json({ error: "Customer not found" });
      return;
    }
    if (!vehicle) {
      res.status(400).json({ error: "Vehicle not found" });
      return;
    }
    if (!vehicle.isActive) {
      res.status(400).json({ error: "Vehicle is not available for booking" });
      return;
    }
    const overlap = await findOverlappingBooking(prisma, vehicleId, startDate, endDate);
    if (overlap) {
      res.status(409).json({ error: "Vehicle already booked for overlapping dates" });
      return;
    }
    const booking = await prisma.booking.create({
      data: {
        customerId,
        vehicleId,
        startDate,
        endDate,
        totalPrice,
        status: status ?? "pending",
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
      },
    });
    res.status(201).json({
      ...serializeBooking(booking),
      customer: booking.customer,
      vehicle: booking.vehicle,
    });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }
    const existing = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    const customerId = parsed.data.customerId ?? existing.customerId;
    const vehicleId = parsed.data.vehicleId ?? existing.vehicleId;
    const startDate = parsed.data.startDate ?? existing.startDate;
    const endDate = parsed.data.endDate ?? existing.endDate;

    if (startDate >= endDate) {
      res.status(400).json({ error: "startDate must be before endDate" });
      return;
    }

    if (parsed.data.customerId) {
      const c = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!c) {
        res.status(400).json({ error: "Customer not found" });
        return;
      }
    }
    if (parsed.data.vehicleId || parsed.data.startDate || parsed.data.endDate) {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) {
        res.status(400).json({ error: "Vehicle not found" });
        return;
      }
      if (!vehicle.isActive && existing.status !== "cancelled") {
        res.status(400).json({ error: "Vehicle is not available for booking" });
        return;
      }
      const overlap = await findOverlappingBooking(prisma, vehicleId, startDate, endDate, req.params.id);
      if (overlap) {
        res.status(409).json({ error: "Vehicle already booked for overlapping dates" });
        return;
      }
    }

    const data: Prisma.BookingUpdateInput = {};
    if (parsed.data.customerId) data.customer = { connect: { id: customerId } };
    if (parsed.data.vehicleId) data.vehicle = { connect: { id: vehicleId } };
    if (parsed.data.startDate) data.startDate = startDate;
    if (parsed.data.endDate) data.endDate = endDate;
    if (parsed.data.totalPrice !== undefined) data.totalPrice = parsed.data.totalPrice;
    if (parsed.data.status) data.status = parsed.data.status;

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
      },
    });
    res.json({
      ...serializeBooking(booking),
      customer: booking.customer,
      vehicle: booking.vehicle,
    });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.booking.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Booking not found" });
  }
});

export default router;
