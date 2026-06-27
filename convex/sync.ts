import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";

const CLEANUP_BATCH_SIZE = 50;

async function deleteNotificationsForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
  limit = CLEANUP_BATCH_SIZE,
) {
  const notifications = await ctx.db
    .query("notifications")
    .withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
    .take(limit);

  await Promise.all(notifications.map((notification) => ctx.db.delete(notification._id)));
  return notifications.length;
}

async function deleteAvailabilityRulesForMentor(
  ctx: MutationCtx,
  userId: Id<"users">,
  limit = CLEANUP_BATCH_SIZE,
) {
  const rules = await ctx.db
    .query("availabilityRules")
    .withIndex("by_mentorUserId", (q) => q.eq("mentorUserId", userId))
    .take(limit);

  await Promise.all(rules.map((rule) => ctx.db.delete(rule._id)));
  return rules.length;
}

async function deleteAvailabilitySlotsForMentor(
  ctx: MutationCtx,
  userId: Id<"users">,
  limit = CLEANUP_BATCH_SIZE,
) {
  const slots = await ctx.db
    .query("availabilitySlots")
    .withIndex("by_mentorUserId_startTime", (q) => q.eq("mentorUserId", userId))
    .take(limit);

  await Promise.all(slots.map((slot) => ctx.db.delete(slot._id)));
  return slots.length;
}

async function deleteRequestsForMentor(
  ctx: MutationCtx,
  userId: Id<"users">,
  limit = CLEANUP_BATCH_SIZE,
) {
  const requests = await ctx.db
    .query("sessionRequests")
    .withIndex("by_mentorUserId_createdAt", (q) => q.eq("mentorUserId", userId))
    .take(limit);

  await Promise.all(requests.map((request) => ctx.db.delete(request._id)));
  return requests.length;
}

async function deleteRequestsForLearner(
  ctx: MutationCtx,
  userId: Id<"users">,
  limit = CLEANUP_BATCH_SIZE,
) {
  const requests = await ctx.db
    .query("sessionRequests")
    .withIndex("by_learnerUserId_createdAt", (q) => q.eq("learnerUserId", userId))
    .take(limit);

  await Promise.all(requests.map((request) => ctx.db.delete(request._id)));
  return requests.length;
}

async function deleteBookingsForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
  limit = CLEANUP_BATCH_SIZE,
) {
  const [rules, slots] = await Promise.all([
    ctx.db
      .query("bookings")
      .withIndex("by_mentorUserId_scheduledAt", (q) => q.eq("mentorUserId", userId))
      .take(limit),
    ctx.db
      .query("bookings")
      .withIndex("by_learnerUserId_scheduledAt", (q) => q.eq("learnerUserId", userId))
      .take(limit),
  ]);
  const uniqueBookings = new Map(
    [...rules, ...slots].map((booking) => [booking._id, booking]),
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
  return uniqueBookings.size;
}

async function deleteProfile(
  ctx: MutationCtx,
  tableName: "mentorProfiles" | "learnerProfiles",
  userId: Id<"users">,
) {
  const doc = await ctx.db
    .query(tableName)
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

  if (!doc) {
    return 0;
  }

  await ctx.db.delete(doc._id);
  return 1;
}

const deletionStages = [
  "mentorProfile",
  "learnerProfile",
  "bookings",
  "mentorRequests",
  "learnerRequests",
  "availabilityRules",
  "availabilitySlots",
  "notifications",
  "user",
] as const;

type DeletionStage = (typeof deletionStages)[number];

function nextDeletionStage(stage: DeletionStage): DeletionStage | null {
  const index = deletionStages.indexOf(stage);
  return index === -1 || index === deletionStages.length - 1
    ? null
    : deletionStages[index + 1];
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

    await ctx.scheduler.runAfter(0, internal.sync.processUserDeletionStage, {
      userId: existing._id,
      stage: "mentorProfile",
    });

    return { deleted: true, scheduled: true };
  },
});

export const processUserDeletionStage = internalMutation({
  args: {
    userId: v.id("users"),
    stage: v.union(
      v.literal("mentorProfile"),
      v.literal("learnerProfile"),
      v.literal("bookings"),
      v.literal("mentorRequests"),
      v.literal("learnerRequests"),
      v.literal("availabilityRules"),
      v.literal("availabilitySlots"),
      v.literal("notifications"),
      v.literal("user"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { complete: true };
    }

    let processed = 0;

    switch (args.stage) {
      case "mentorProfile":
        processed = await deleteProfile(ctx, "mentorProfiles", args.userId);
        break;
      case "learnerProfile":
        processed = await deleteProfile(ctx, "learnerProfiles", args.userId);
        break;
      case "bookings":
        processed = await deleteBookingsForUser(ctx, args.userId);
        break;
      case "mentorRequests":
        processed = await deleteRequestsForMentor(ctx, args.userId);
        break;
      case "learnerRequests":
        processed = await deleteRequestsForLearner(ctx, args.userId);
        break;
      case "availabilityRules":
        processed = await deleteAvailabilityRulesForMentor(ctx, args.userId);
        break;
      case "availabilitySlots":
        processed = await deleteAvailabilitySlotsForMentor(ctx, args.userId);
        break;
      case "notifications":
        processed = await deleteNotificationsForUser(ctx, args.userId);
        break;
      case "user":
        await ctx.db.delete(args.userId);
        return { complete: true };
    }

    const rerunStage =
      processed >= CLEANUP_BATCH_SIZE ? args.stage : nextDeletionStage(args.stage);

    if (rerunStage) {
      await ctx.scheduler.runAfter(0, internal.sync.processUserDeletionStage, {
        userId: args.userId,
        stage: rerunStage,
      });
    }

    return { complete: rerunStage === null };
  },
});
