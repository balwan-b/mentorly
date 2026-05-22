import type { SessionRequestStatus } from "@/lib/status";

export type SessionRequest = {
  topic: string;
  message: string;
  preferredDurationMinutes: number;
  preferredStart?: number;
  preferredEnd?: number;
  status: SessionRequestStatus;
};
