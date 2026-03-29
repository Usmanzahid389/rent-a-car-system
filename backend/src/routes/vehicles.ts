import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
const router = Router();

const createSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  licensePlate: z.string().min(1),
  dailyRate: z.union([z.number().positive(), z.string()]).transform((v) => new Prisma.Decimal(String(v))),
  isActive: z.boolean().optional(),
});

const updateSchema = z
  .object({
    make: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    licensePlate: z.string().min(1).optional(),
    dailyRate: z.union([z.number().positive(), z.string()]).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

function serializeVehicle(v: {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
  dailyRate: Prisma.Decimal;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...v,
    dailyRate: v.dailyRate.toString(),
  };
}

router.get("/", async (_req, res, next) => {
  try {
    const vehicles = await prisma.vehicle.findMany({ orderBy: { createdAt: "desc" } });
    res.json(vehicles.map(serializeVehicle));
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }
    res.json(serializeVehicle(vehicle));
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
    const vehicle = await prisma.vehicle.create({ data: parsed.data });
    res.status(201).json(serializeVehicle(vehicle));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      res.status(409).json({ error: "License plate already exists" });
      return;
    }
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
    const p = parsed.data;
    const data: {
      make?: string;
      model?: string;
      licensePlate?: string;
      dailyRate?: Prisma.Decimal;
      isActive?: boolean;
    } = {};
    if (p.make !== undefined) data.make = p.make;
    if (p.model !== undefined) data.model = p.model;
    if (p.licensePlate !== undefined) data.licensePlate = p.licensePlate;
    if (p.dailyRate !== undefined) data.dailyRate = new Prisma.Decimal(String(p.dailyRate));
    if (p.isActive !== undefined) data.isActive = p.isActive;
    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    try {
      const vehicle = await prisma.vehicle.update({
        where: { id: req.params.id },
        data,
      });
      res.json(serializeVehicle(vehicle));
    } catch {
      res.status(404).json({ error: "Vehicle not found" });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      res.status(409).json({ error: "License plate already exists" });
      return;
    }
    next(e);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.vehicle.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Vehicle not found" });
  }
});

export default router;
