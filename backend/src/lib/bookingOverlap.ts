import type { PrismaClient } from "@prisma/client";

/** Overlap if existing.start < newEnd AND existing.end > newStart. Ignores cancelled bookings. */
export async function findOverlappingBooking(
  prisma: PrismaClient,
  vehicleId: string,
  startDate: Date,
  endDate: Date,
  excludeBookingId?: string
) {
  return prisma.booking.findFirst({
    where: {
      vehicleId,
      status: { not: "cancelled" },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      AND: [{ startDate: { lt: endDate } }, { endDate: { gt: startDate } }],
    },
  });
}
