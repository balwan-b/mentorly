import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getViewerUser, requireViewerUser } from "./lib/auth";
import { notificationTypeValidator } from "./lib/validators";
import { clampQueryLimit } from "./lib/domain";

const NOTIFICATION_LIST_LIMIT = 100;
const NOTIFICATION_READ_BATCH_SIZE = 100;

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
    const limit = clampQueryLimit(args.limit, 20, NOTIFICATION_LIST_LIMIT);
    return await ctx.db
      .query("notifications")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);
  },
});

export const markNotificationsReadBatchInternal = internalMutation({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = clampQueryLimit(
      args.limit,
      NOTIFICATION_READ_BATCH_SIZE,
      NOTIFICATION_READ_BATCH_SIZE,
    );
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_isRead_createdAt", (q) =>
        q.eq("userId", args.userId).eq("isRead", false),
      )
      .take(limit);

    if (unread.length === 0) {
      return { processed: 0, remaining: false };
    }

    await Promise.all(
      unread.map((notification) =>
        ctx.db.patch(notification._id, { isRead: true }),
      ),
    );

    return {
      processed: unread.length,
      remaining: unread.length === limit,
    };
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
    let processed = 0;
    let remaining = false;

    do {
      const result: { processed: number; remaining: boolean } = await ctx.runMutation(
        internal.notifications.markNotificationsReadBatchInternal,
        {
          userId: user._id,
          limit: NOTIFICATION_READ_BATCH_SIZE,
        },
      );
      processed += result.processed;
      remaining = result.remaining;
    } while (remaining);

    await ctx.db.patch(user._id, {
      unreadNotificationCount: Math.max((user.unreadNotificationCount ?? 0) - processed, 0),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
