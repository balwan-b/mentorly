import { v } from "convex/values";

export const sessionFormatValidator = v.union(
  v.literal("video"),
  v.literal("audio"),
  v.literal("chat"),
);

export const notificationTypeValidator = v.union(
  v.literal("system"),
  v.literal("profile"),
  v.literal("session_request_received"),
  v.literal("session_request_accepted"),
  v.literal("session_request_declined"),
  v.literal("booking_scheduled"),
  v.literal("booking_cancelled"),
);

export const sessionRequestStatusValidator = v.union(
  v.literal("submitted"),
  v.literal("accepted"),
  v.literal("declined"),
  v.literal("withdrawn"),
);

export const bookingStatusValidator = v.union(
  v.literal("scheduled"),
  v.literal("completed"),
  v.literal("cancelled"),
);
