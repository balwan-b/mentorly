import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getOrCreateViewerUser, getViewerUser, requireViewerUser } from "./lib/auth";
import { notifyUser } from "./lib/notifications";

export const createSessionRequest = mutation({
  args: {
    mentorUserId: v.id("users"),
    topic: v.string(),
    message: v.string(),
    preferredDurationMinutes: v.number(),
    preferredStart: v.optional(v.number()),
    preferredEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const learner = await getOrCreateViewerUser(ctx);
    const mentor = await ctx.db.get(args.mentorUserId);
    if (!mentor) {
      throw new ConvexError("Mentor not found.");
    }
    if (mentor._id === learner._id) {
      throw new ConvexError("You cannot request a session with yourself.");
    }

    const mentorProfile = await ctx.db
      .query("mentorProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.mentorUserId))
      .unique();
    if (!mentorProfile || !mentorProfile.isActive) {
      throw new ConvexError("This mentor is not available for requests.");
    }

    if (args.preferredEnd && args.preferredStart && args.preferredEnd < args.preferredStart) {
      throw new ConvexError("Preferred end time cannot be earlier than start time.");
    }

    const now = Date.now();
    const requestId = await ctx.db.insert("sessionRequests", {
      mentorUserId: args.mentorUserId,
      learnerUserId: learner._id,
      topic: args.topic.trim(),
      message: args.message.trim(),
      preferredDurationMinutes: args.preferredDurationMinutes,
      preferredStart: args.preferredStart,
      preferredEnd: args.preferredEnd,
      status: "submitted",
      createdAt: now,
      updatedAt: now,
    });

    await notifyUser(ctx, {
      userId: mentor._id,
      type: "session_request_received",
      title: "New session request",
      message: `${learner.firstName ?? "A learner"} sent a request about ${args.topic.trim()}.`,
      linkUrl: "/requests",
    });

    return requestId;
  },
});

export const listMyLearnerSessionRequests = query({
  args: {},
  handler: async (ctx) => {
    const learner = await getViewerUser(ctx);
    if (!learner) {
      return [];
    }
    const requests = await ctx.db
      .query("sessionRequests")
      .withIndex("by_learnerUserId_createdAt", (q) =>
        q.eq("learnerUserId", learner._id),
      )
      .order("desc")
      .collect();

    return await Promise.all(
      requests.map(async (request) => {
        const [mentorUser, mentorProfile] = await Promise.all([
          ctx.db.get(request.mentorUserId),
          ctx.db
            .query("mentorProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", request.mentorUserId))
            .unique(),
        ]);

        const expectedPrice = mentorProfile?.hourlyRate
          ? Math.round((mentorProfile.hourlyRate * request.preferredDurationMinutes) / 60)
          : undefined;

        return { ...request, mentorUser, mentorProfile, expectedPrice };
      }),
    );
  },
});

export const listMyMentorSessionRequests = query({
  args: {},
  handler: async (ctx) => {
    const mentor = await getViewerUser(ctx);
    if (!mentor) {
      return [];
    }
    const requests = await ctx.db
      .query("sessionRequests")
      .withIndex("by_mentorUserId_createdAt", (q) =>
        q.eq("mentorUserId", mentor._id),
      )
      .order("desc")
      .collect();

    return await Promise.all(
      requests.map(async (request) => {
        const [learnerUser, mentorProfile] = await Promise.all([
          ctx.db.get(request.learnerUserId),
          ctx.db
            .query("mentorProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", request.mentorUserId))
            .unique(),
        ]);
        const expectedPrice = mentorProfile?.hourlyRate
          ? Math.round((mentorProfile.hourlyRate * request.preferredDurationMinutes) / 60)
          : undefined;
        return { ...request, learnerUser, mentorProfile, expectedPrice };
      }),
    );
  },
});

export const getSessionRequestById = query({
  args: { requestId: v.id("sessionRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return null;
    }

    const [mentorUser, learnerUser] = await Promise.all([
      ctx.db.get(request.mentorUserId),
      ctx.db.get(request.learnerUserId),
    ]);

    return { ...request, mentorUser, learnerUser };
  },
});

export const acceptSessionRequest = mutation({
  args: { requestId: v.id("sessionRequests") },
  handler: async (ctx, args) => {
    const mentor = await requireViewerUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.mentorUserId !== mentor._id) {
      throw new ConvexError("Session request not found.");
    }
    await ctx.db.patch(args.requestId, {
      status: "accepted",
      updatedAt: Date.now(),
    });
    await notifyUser(ctx, {
      userId: request.learnerUserId,
      type: "session_request_accepted",
      title: "Session request accepted",
      message: `Your request for ${request.topic} was accepted.`,
      linkUrl: "/bookings",
    });
    return { success: true };
  },
});

export const declineSessionRequest = mutation({
  args: { requestId: v.id("sessionRequests") },
  handler: async (ctx, args) => {
    const mentor = await requireViewerUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.mentorUserId !== mentor._id) {
      throw new ConvexError("Session request not found.");
    }
    await ctx.db.patch(args.requestId, {
      status: "declined",
      updatedAt: Date.now(),
    });
    await notifyUser(ctx, {
      userId: request.learnerUserId,
      type: "session_request_declined",
      title: "Session request declined",
      message: `Your request for ${request.topic} was declined.`,
      linkUrl: "/requests",
    });
    return { success: true };
  },
});

export const withdrawSessionRequest = mutation({
  args: { requestId: v.id("sessionRequests") },
  handler: async (ctx, args) => {
    const learner = await requireViewerUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.learnerUserId !== learner._id) {
      throw new ConvexError("Session request not found.");
    }
    await ctx.db.patch(args.requestId, {
      status: "withdrawn",
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
