import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getOrCreateViewerUser, getViewerUser, requireViewerUser } from "./lib/auth";
import { DEFAULT_SLOT_DURATION_MINUTES } from "../lib/constants";
import {
  clampQueryLimit,
  ensureValidTimeZone,
  validateAvailabilityRules,
} from "./lib/domain";

const AVAILABLE_SLOT_LIMIT = 100;
const DEFAULT_TIME_ZONE = "UTC";

function parseTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

function getTimeZoneParts(timestamp: number, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(new Date(timestamp));
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
  };
}

function zonedLocalTimeToUtc(
  value: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  },
  timeZone: string,
) {
  let guess = Date.UTC(
    value.year,
    value.month - 1,
    value.day,
    value.hour,
    value.minute,
    0,
    0,
  );

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = getTimeZoneParts(guess, timeZone);
    const desiredMinutes = Date.UTC(
      value.year,
      value.month - 1,
      value.day,
      value.hour,
      value.minute,
    ) / 60000;
    const actualMinutes = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
    ) / 60000;
    const diffMinutes = desiredMinutes - actualMinutes;

    if (diffMinutes === 0) {
      return guess;
    }

    guess += diffMinutes * 60 * 1000;
  }

  return guess;
}

function buildSlotRange(
  rules: Array<{
    dayOfWeek: number;
    endTime: string;
    isAvailable: boolean;
    startTime: string;
    timeZone?: string;
  }>,
  now: number,
  daysAhead: number,
  slotDurationMinutes: number,
) {
  const desiredSlots = new Map<number, { endTime: number }>();
  const timeZone = rules[0]?.timeZone ?? DEFAULT_TIME_ZONE;
  const today = getTimeZoneParts(now, timeZone);

  for (let offset = 0; offset < daysAhead; offset += 1) {
    const localDate = new Date(
      Date.UTC(today.year, today.month - 1, today.day + offset, 0, 0, 0, 0),
    );
    const year = localDate.getUTCFullYear();
    const month = localDate.getUTCMonth() + 1;
    const day = localDate.getUTCDate();
    const dayOfWeek = localDate.getUTCDay();
    const dayRules = rules.filter(
      (rule) => rule.dayOfWeek === dayOfWeek && rule.isAvailable,
    );

    for (const rule of dayRules) {
      const start = parseTime(rule.startTime);
      const end = parseTime(rule.endTime);
      const startTimestamp = zonedLocalTimeToUtc(
        {
          year,
          month,
          day,
          hour: start.hours,
          minute: start.minutes,
        },
        timeZone,
      );
      const endTimestamp = zonedLocalTimeToUtc(
        {
          year,
          month,
          day,
          hour: end.hours,
          minute: end.minutes,
        },
        timeZone,
      );

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
    timeZone: v.string(),
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
    validateAvailabilityRules(args.rules);
    ensureValidTimeZone(args.timeZone);
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
          timeZone: args.timeZone,
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
      .withIndex("by_mentorUserId_status_startTime", (q) =>
        q.eq("mentorUserId", mentor._id).eq("status", "available"),
      )
      .collect();
    const daysAhead = args.daysAhead ?? 14;
    const slotDurationMinutes =
      args.slotDurationMinutes ?? DEFAULT_SLOT_DURATION_MINUTES;
    if (!Number.isInteger(daysAhead) || daysAhead < 1 || daysAhead > 30) {
      throw new ConvexError("Days ahead must be between 1 and 30.");
    }
    if (
      !Number.isInteger(slotDurationMinutes) ||
      slotDurationMinutes < 15 ||
      slotDurationMinutes > 180
    ) {
      throw new ConvexError("Slot duration must be between 15 and 180 minutes.");
    }
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
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = clampQueryLimit(args.limit, 50, AVAILABLE_SLOT_LIMIT);
    return await ctx.db
      .query("availabilitySlots")
      .withIndex("by_mentorUserId_status_startTime", (q) =>
        q.eq("mentorUserId", args.mentorUserId).eq("status", "available"),
      )
      .take(limit);
  },
});

export const listAvailableSlotsForSessionRequest = query({
  args: {
    sessionRequestId: v.id("sessionRequests"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewerUser(ctx);
    const request = await ctx.db.get(args.sessionRequestId);
    if (!request || request.status !== "accepted") {
      return [];
    }
    if (request.mentorUserId !== viewer._id && request.learnerUserId !== viewer._id) {
      throw new ConvexError("You do not have access to these slots.");
    }
    const limit = clampQueryLimit(args.limit, 50, AVAILABLE_SLOT_LIMIT);
    const slots = await ctx.db
      .query("availabilitySlots")
      .withIndex("by_mentorUserId_status_startTime", (q) => {
        if (
          request.preferredStart !== undefined &&
          request.preferredEnd !== undefined
        ) {
          return q
            .eq("mentorUserId", request.mentorUserId)
            .eq("status", "available")
            .gte("startTime", request.preferredStart)
            .lte("startTime", request.preferredEnd);
        }
        if (request.preferredStart !== undefined) {
          return q
            .eq("mentorUserId", request.mentorUserId)
            .eq("status", "available")
            .gte("startTime", request.preferredStart);
        }
        if (request.preferredEnd !== undefined) {
          return q
            .eq("mentorUserId", request.mentorUserId)
            .eq("status", "available")
            .lte("startTime", request.preferredEnd);
        }
        return q
          .eq("mentorUserId", request.mentorUserId)
          .eq("status", "available");
      })
      .take(limit * 2);

    return slots
      .filter((slot) => {
        if (request.preferredStart !== undefined && slot.startTime < request.preferredStart) {
          return false;
        }
        if (request.preferredEnd !== undefined && slot.endTime > request.preferredEnd) {
          return false;
        }
        return slot.endTime - slot.startTime >= request.preferredDurationMinutes * 60 * 1000;
      })
      .slice(0, limit);
  },
});
