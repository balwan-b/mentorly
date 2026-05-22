export const SESSION_FORMATS = ["video", "audio", "chat"] as const;
export type SessionFormat = (typeof SESSION_FORMATS)[number];

export const SESSION_FORMAT_LABELS: Record<SessionFormat, string> = {
  video: "Video",
  audio: "Audio",
  chat: "Chat",
};

export const SESSION_REQUEST_STATUSES = [
  "submitted",
  "accepted",
  "declined",
  "withdrawn",
] as const;
export type SessionRequestStatus = (typeof SESSION_REQUEST_STATUSES)[number];

export const SESSION_REQUEST_STATUS_LABELS: Record<
  SessionRequestStatus,
  string
> = {
  submitted: "Submitted",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
};

export const BOOKING_STATUSES = [
  "scheduled",
  "completed",
  "cancelled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const NOTIFICATION_TYPES = [
  "system",
  "profile",
  "session_request_received",
  "session_request_accepted",
  "session_request_declined",
  "booking_scheduled",
  "booking_cancelled",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
