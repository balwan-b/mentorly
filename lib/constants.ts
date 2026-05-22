import type { SessionFormat } from "./status";

export const DEFAULT_SESSION_FORMATS: SessionFormat[] = ["video"];

export const DEFAULT_TOPIC_SUGGESTIONS = [
  "Frontend development",
  "Backend development",
  "System design",
  "Career guidance",
  "Interview preparation",
  "Portfolio review",
];

export const DEFAULT_REQUEST_DURATIONS_MINUTES = [30, 45, 60, 90];

export const DEFAULT_SLOT_DURATION_MINUTES = 30;

export const DEFAULT_WEEKLY_AVAILABILITY = [
  { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isAvailable: true },
  { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isAvailable: true },
  { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", isAvailable: true },
  { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", isAvailable: true },
  { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", isAvailable: true },
  { dayOfWeek: 6, startTime: "09:00", endTime: "12:00", isAvailable: false },
  { dayOfWeek: 0, startTime: "09:00", endTime: "12:00", isAvailable: false },
] as const;
