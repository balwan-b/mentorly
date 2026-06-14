import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getOrCreateViewerUser, getViewerUser } from "./lib/auth";
import { sessionFormatValidator } from "./lib/validators";
import { DEFAULT_SESSION_FORMATS } from "../lib/constants";
import {
  clampQueryLimit,
  normalizeTopics,
  validateMoneyAmount,
  validateNonNegativeInteger,
  validateProfileFields,
} from "./lib/domain";

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewerUser(ctx);
    if (!user) {
      return null;
    }

    const [mentorProfile, learnerProfile] = await Promise.all([
      ctx.db
        .query("mentorProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .unique(),
      ctx.db
        .query("learnerProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .unique(),
    ]);

    return { user, mentorProfile, learnerProfile };
  },
});

export const getPublicMentorProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const mentorProfile = await ctx.db
      .query("mentorProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!mentorProfile || !mentorProfile.isActive) {
      return null;
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    return {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
      },
      mentorProfile,
    };
  },
});

export const listActiveMentors = query({
  args: {
    topic: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = clampQueryLimit(args.limit, 24, 50);
    const topic = args.topic?.trim().toLowerCase();
    const rows = await ctx.db
      .query("mentorProfiles")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(topic ? 200 : limit);

    const filtered = topic
      ? rows.filter((row) =>
          row.topics.some((item) => item.toLowerCase().includes(topic)),
        )
      : rows;

    const limited = filtered.slice(0, limit);
    return await Promise.all(
      limited.map(async (mentorProfile) => {
        const user = await ctx.db.get(mentorProfile.userId);
        return {
          user: user
            ? {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                imageUrl: user.imageUrl,
              }
            : null,
          mentorProfile,
        };
      }),
    );
  },
});

export const upsertMentorProfile = mutation({
  args: {
    headline: v.optional(v.string()),
    bio: v.optional(v.string()),
    topics: v.optional(v.array(v.string())),
    yearsExperience: v.optional(v.number()),
    hourlyRate: v.optional(v.number()),
    sessionFormats: v.optional(v.array(sessionFormatValidator)),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    validateProfileFields({
      headline: args.headline,
      bio: args.bio,
    });
    validateNonNegativeInteger(args.yearsExperience, "Years of experience", 80);
    validateMoneyAmount(args.hourlyRate, "Hourly rate");
    if ((args.sessionFormats ?? DEFAULT_SESSION_FORMATS).length === 0) {
      throw new ConvexError("At least one session format is required.");
    }

    const user = await getOrCreateViewerUser(ctx);
    const existing = await ctx.db
      .query("mentorProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    const now = Date.now();

    const patch = {
      headline: args.headline,
      bio: args.bio,
      topics: normalizeTopics(args.topics),
      yearsExperience: args.yearsExperience,
      hourlyRate: args.hourlyRate,
      sessionFormats: args.sessionFormats ?? DEFAULT_SESSION_FORMATS,
      isActive: args.isActive,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("mentorProfiles", {
      userId: user._id,
      createdAt: now,
      ...patch,
    });
  },
});

export const upsertLearnerProfile = mutation({
  args: {
    goals: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateProfileFields({
      bio: args.bio,
      goals: args.goals,
    });

    const user = await getOrCreateViewerUser(ctx);
    const existing = await ctx.db
      .query("learnerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        goals: args.goals,
        bio: args.bio,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("learnerProfiles", {
      userId: user._id,
      goals: args.goals,
      bio: args.bio,
      createdAt: now,
      updatedAt: now,
    });
  },
});
