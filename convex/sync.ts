import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

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

    const [mentorProfile, learnerProfile, notifications] = await Promise.all([
      ctx.db
        .query("mentorProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", existing._id))
        .unique(),
      ctx.db
        .query("learnerProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", existing._id))
        .unique(),
      ctx.db
        .query("notifications")
        .withIndex("by_userId_createdAt", (q) => q.eq("userId", existing._id))
        .collect(),
    ]);

    if (mentorProfile) {
      await ctx.db.delete(mentorProfile._id);
    }
    if (learnerProfile) {
      await ctx.db.delete(learnerProfile._id);
    }
    await Promise.all(notifications.map((notification) => ctx.db.delete(notification._id)));
    await ctx.db.delete(existing._id);
    return { deleted: true };
  },
});
