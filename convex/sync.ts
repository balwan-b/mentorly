import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";

async function deleteNotificationsForUser(ctx: MutationCtx, userId: Id<"users">) {
  const notifications = await ctx.db
    .query("notifications")
    .withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
    .collect();

  await Promise.all(notifications.map((notification) => ctx.db.delete(notification._id)));
}

async function deleteAvailabilityForMentor(ctx: MutationCtx, userId: Id<"users">) {
  const [rules, slots] = await Promise.all([
    ctx.db
      .query("availabilityRules")
      .withIndex("by_mentorUserId", (q) => q.eq("mentorUserId", userId))
      .collect(),
    ctx.db
      .query("availabilitySlots")
      .withIndex("by_mentorUserId_startTime", (q) => q.eq("mentorUserId", userId))
      .collect(),
  ]);

  await Promise.all([
    ...rules.map((rule) => ctx.db.delete(rule._id)),
    ...slots.map((slot) => ctx.db.delete(slot._id)),
  ]);
}

async function deleteRequestsForUser(ctx: MutationCtx, userId: Id<"users">) {
  const [mentorRequests, learnerRequests] = await Promise.all([
    ctx.db
      .query("sessionRequests")
      .withIndex("by_mentorUserId_createdAt", (q) => q.eq("mentorUserId", userId))
      .collect(),
    ctx.db
      .query("sessionRequests")
      .withIndex("by_learnerUserId_createdAt", (q) => q.eq("learnerUserId", userId))
      .collect(),
  ]);

  const requestIds = new Set([
    ...mentorRequests.map((request) => request._id),
    ...learnerRequests.map((request) => request._id),
  ]);

  await Promise.all(Array.from(requestIds, (requestId) => ctx.db.delete(requestId)));
}

async function deleteBookingsForUser(ctx: MutationCtx, userId: Id<"users">) {
  const [mentorBookings, learnerBookings] = await Promise.all([
    ctx.db
      .query("bookings")
      .withIndex("by_mentorUserId_scheduledAt", (q) => q.eq("mentorUserId", userId))
      .collect(),
    ctx.db
      .query("bookings")
      .withIndex("by_learnerUserId_scheduledAt", (q) => q.eq("learnerUserId", userId))
      .collect(),
  ]);

  const uniqueBookings = new Map(
    [...mentorBookings, ...learnerBookings].map((booking) => [booking._id, booking]),
  );

  await Promise.all(
    Array.from(uniqueBookings.values()).map(async (booking) => {
      const slot = await ctx.db.get(booking.slotId);
      if (slot) {
        await ctx.db.patch(slot._id, {
          status: "available",
          bookingId: undefined,
          updatedAt: Date.now(),
        });
      }
      await ctx.db.delete(booking._id);
    }),
  );
}

export const upsertUserFromWebhook = internalMutation({
  args: {
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        imageUrl: args.imageUrl,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkUserId: args.clerkUserId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      imageUrl: args.imageUrl,
      unreadNotificationCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteUserFromWebhook = internalMutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();

    if (!existing) {
      return { deleted: false };
    }

    const [mentorProfile, learnerProfile] = await Promise.all([
      ctx.db
        .query("mentorProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", existing._id))
        .unique(),
      ctx.db
        .query("learnerProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", existing._id))
        .unique(),
    ]);

    if (mentorProfile) {
      await ctx.db.delete(mentorProfile._id);
    }
    if (learnerProfile) {
      await ctx.db.delete(learnerProfile._id);
    }
    await deleteAvailabilityForMentor(ctx, existing._id);
    await deleteBookingsForUser(ctx, existing._id);
    await deleteRequestsForUser(ctx, existing._id);
    await deleteNotificationsForUser(ctx, existing._id);
    await ctx.db.delete(existing._id);
    return { deleted: true };
  },
});
