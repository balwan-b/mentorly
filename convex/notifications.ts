import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getViewerUser, requireViewerUser } from "./lib/auth";
import { notificationTypeValidator } from "./lib/validators";

export const createNotificationInternal = internalMutation({
  args: {
    userId: v.id("users"),
    type: notificationTypeValidator,
    title: v.string(),
    message: v.string(),
    linkUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      linkUrl: args.linkUrl,
      isRead: false,
      createdAt: Date.now(),
    });

    if (user) {
      await ctx.db.patch(user._id, {
        unreadNotificationCount: (user.unreadNotificationCount ?? 0) + 1,
        updatedAt: Date.now(),
      });
    }

    return notificationId;
  },
});

export const listMyNotifications = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getViewerUser(ctx);
    if (!user) {
      return [];
    }
    const limit = Math.max(1, Math.min(args.limit ?? 20, 100));
    return await ctx.db
      .query("notifications")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);
  },
});

export const getUnreadNotificationCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewerUser(ctx);
    if (!user) {
      return 0;
    }
    return user.unreadNotificationCount ?? 0;
  },
});

export const markNotificationRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await requireViewerUser(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) {
      return { success: false };
    }
    await ctx.db.patch(args.notificationId, { isRead: true });
    if (!notification.isRead) {
      await ctx.db.patch(user._id, {
        unreadNotificationCount: Math.max((user.unreadNotificationCount ?? 0) - 1, 0),
        updatedAt: Date.now(),
      });
    }
    return { success: true };
  },
});

export const markAllNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireViewerUser(ctx);
    if ((user.unreadNotificationCount ?? 0) === 0) {
      return { success: true };
    }
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_isRead_createdAt", (q) =>
        q.eq("userId", user._id).eq("isRead", false),
      )
      .collect();
    await Promise.all(
      unread.map((notification) =>
        ctx.db.patch(notification._id, { isRead: true }),
      ),
    );
    await ctx.db.patch(user._id, {
      unreadNotificationCount: 0,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
