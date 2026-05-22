import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getOrCreateViewerUser, getViewerUser } from "./lib/auth";
import { DEFAULT_SLOT_DURATION_MINUTES } from "../lib/constants";

function parseTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

function startOfUtcDay(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0,
    0,
    0,
    0,
  );
}

function buildSlotRange(
  rules: Array<{
    dayOfWeek: number;
    endTime: string;
    isAvailable: boolean;
    startTime: string;
  }>,
  now: number,
  daysAhead: number,
  slotDurationMinutes: number,
) {
  const desiredSlots = new Map<number, { endTime: number }>();

  for (let offset = 0; offset < daysAhead; offset += 1) {
    const dayStart = startOfUtcDay(now + offset * 24 * 60 * 60 * 1000);
    const dayOfWeek = new Date(dayStart).getUTCDay();
    const dayRules = rules.filter(
      (rule) => rule.dayOfWeek === dayOfWeek && rule.isAvailable,
    );

    for (const rule of dayRules) {
      const start = parseTime(rule.startTime);
      const end = parseTime(rule.endTime);
      const startTimestamp =
        dayStart + (start.hours * 60 + start.minutes) * 60 * 1000;
      const endTimestamp = dayStart + (end.hours * 60 + end.minutes) * 60 * 1000;

      for (
        let timestamp = startTimestamp;
        timestamp + slotDurationMinutes * 60 * 1000 <= endTimestamp;
        timestamp += slotDurationMinutes * 60 * 1000
      ) {
        desiredSlots.set(timestamp, {
          endTime: timestamp + slotDurationMinutes * 60 * 1000,
        });
      }
    }
  }

  return desiredSlots;
}

export const listMyAvailabilityRules = query({
  args: {},
  handler: async (ctx) => {
    const mentor = await getViewerUser(ctx);
    if (!mentor) {
      return [];
    }
    return await ctx.db
      .query("availabilityRules")
      .withIndex("by_mentorUserId", (q) => q.eq("mentorUserId", mentor._id))
      .collect();
  },
});

export const setWeeklyAvailabilityRules = mutation({
  args: {
    rules: v.array(
      v.object({
        dayOfWeek: v.number(),
        startTime: v.string(),
        endTime: v.string(),
        isAvailable: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const mentor = await getOrCreateViewerUser(ctx);
    const existing = await ctx.db
      .query("availabilityRules")
      .withIndex("by_mentorUserId", (q) => q.eq("mentorUserId", mentor._id))
      .collect();
    await Promise.all(existing.map((rule) => ctx.db.delete(rule._id)));

    const now = Date.now();
    await Promise.all(
      args.rules.map((rule) =>
        ctx.db.insert("availabilityRules", {
          mentorUserId: mentor._id,
          dayOfWeek: rule.dayOfWeek,
          startTime: rule.startTime,
          endTime: rule.endTime,
          isAvailable: rule.isAvailable,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );

    return { success: true };
  },
});

export const generateAvailabilitySlots = mutation({
  args: {
    daysAhead: v.optional(v.number()),
    slotDurationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const mentor = await getOrCreateViewerUser(ctx);
    const rules = await ctx.db
      .query("availabilityRules")
      .withIndex("by_mentorUserId", (q) => q.eq("mentorUserId", mentor._id))
      .collect();
    const existingAvailableSlots = await ctx.db
      .query("availabilitySlots")
      .withIndex("by_mentorUserId_status", (q) =>
        q.eq("mentorUserId", mentor._id).eq("status", "available"),
      )
      .collect();
    const daysAhead = args.daysAhead ?? 14;
    const slotDurationMinutes =
      args.slotDurationMinutes ?? DEFAULT_SLOT_DURATION_MINUTES;
    const now = Date.now();
    const desiredSlots = buildSlotRange(rules, now, daysAhead, slotDurationMinutes);
    const existingByStartTime = new Map(
      existingAvailableSlots.map((slot) => [slot.startTime, slot]),
    );

    await Promise.all(
      existingAvailableSlots
        .filter((slot) => !desiredSlots.has(slot.startTime))
        .map((slot) => ctx.db.delete(slot._id)),
    );

    for (const [startTime, slot] of desiredSlots.entries()) {
      if (existingByStartTime.has(startTime)) {
        continue;
      }

      await ctx.db.insert("availabilitySlots", {
        mentorUserId: mentor._id,
        startTime,
        endTime: slot.endTime,
        status: "available",
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

export const listAvailableSlotsForMentor = query({
  args: {
    mentorUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("availabilitySlots")
      .withIndex("by_mentorUserId_status", (q) =>
        q.eq("mentorUserId", args.mentorUserId).eq("status", "available"),
      )
      .collect();
  },
});

export const listAvailableSlotsForSessionRequest = query({
  args: { sessionRequestId: v.id("sessionRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.sessionRequestId);
    if (!request || request.status !== "accepted") {
      return [];
    }
    const slots = await ctx.db
      .query("availabilitySlots")
      .withIndex("by_mentorUserId_status", (q) =>
        q.eq("mentorUserId", request.mentorUserId).eq("status", "available"),
      )
      .collect();

    return slots.filter((slot) => {
      if (request.preferredStart && slot.startTime < request.preferredStart) {
        return false;
      }
      if (request.preferredEnd && slot.endTime > request.preferredEnd) {
        return false;
      }
      return slot.endTime - slot.startTime >= request.preferredDurationMinutes * 60 * 1000;
    });
  },
});
