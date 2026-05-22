import type { BookingStatus } from "@/lib/status";

export type Booking = {
  scheduledAt: number;
  durationMinutes: number;
  hourlyRateSnapshot?: number;
  expectedPrice?: number;
  status: BookingStatus;
};
