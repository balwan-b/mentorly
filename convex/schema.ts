import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  bookingStatusValidator,
  notificationTypeValidator,
  sessionFormatValidator,
  sessionRequestStatusValidator,
} from "./lib/validators";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    tokenIdentifier: v.optional(v.string()),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    unreadNotificationCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_tokenIdentifier", ["tokenIdentifier"]),

  mentorProfiles: defineTable({
    userId: v.id("users"),
    headline: v.optional(v.string()),
    bio: v.optional(v.string()),
    topics: v.array(v.string()),
    yearsExperience: v.optional(v.number()),
    hourlyRate: v.optional(v.number()),
    sessionFormats: v.array(sessionFormatValidator),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_isActive", ["isActive"]),

  learnerProfiles: defineTable({
    userId: v.id("users"),
    goals: v.optional(v.string()),
    bio: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  sessionRequests: defineTable({
    mentorUserId: v.id("users"),
    learnerUserId: v.id("users"),
    topic: v.string(),
    message: v.string(),
    preferredDurationMinutes: v.number(),
    preferredStart: v.optional(v.number()),
    preferredEnd: v.optional(v.number()),
    status: sessionRequestStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_mentorUserId_createdAt", ["mentorUserId", "createdAt"])
    .index("by_learnerUserId_createdAt", ["learnerUserId", "createdAt"])
    .index("by_mentorUserId_status", ["mentorUserId", "status"])
    .index("by_learnerUserId_status", ["learnerUserId", "status"]),

  availabilityRules: defineTable({
    mentorUserId: v.id("users"),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    isAvailable: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_mentorUserId", ["mentorUserId"])
    .index("by_mentorUserId_dayOfWeek", ["mentorUserId", "dayOfWeek"]),

  availabilitySlots: defineTable({
    mentorUserId: v.id("users"),
    startTime: v.number(),
    endTime: v.number(),
    status: v.union(v.literal("available"), v.literal("booked")),
    bookingId: v.optional(v.id("bookings")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_mentorUserId_startTime", ["mentorUserId", "startTime"])
    .index("by_mentorUserId_status", ["mentorUserId", "status"])
    .index("by_bookingId", ["bookingId"]),

  bookings: defineTable({
    sessionRequestId: v.id("sessionRequests"),
    mentorUserId: v.id("users"),
    learnerUserId: v.id("users"),
    slotId: v.id("availabilitySlots"),
    scheduledAt: v.number(),
    durationMinutes: v.number(),
    hourlyRateSnapshot: v.optional(v.number()),
    expectedPrice: v.optional(v.number()),
    status: bookingStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sessionRequestId", ["sessionRequestId"])
    .index("by_mentorUserId_scheduledAt", ["mentorUserId", "scheduledAt"])
    .index("by_learnerUserId_scheduledAt", ["learnerUserId", "scheduledAt"])
    .index("by_status_scheduledAt", ["status", "scheduledAt"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: notificationTypeValidator,
    title: v.string(),
    message: v.string(),
    linkUrl: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId_createdAt", ["userId", "createdAt"])
    .index("by_userId_isRead_createdAt", ["userId", "isRead", "createdAt"]),
});
