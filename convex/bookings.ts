import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getViewerUser, requireViewerUser } from "./lib/auth";
import { notifyUser } from "./lib/notifications";

export const createBookingFromSessionRequest = mutation({
  args: {
    sessionRequestId: v.id("sessionRequests"),
    slotId: v.id("availabilitySlots"),
  },
  handler: async (ctx, args) => {
    const learner = await requireViewerUser(ctx);
    const request = await ctx.db.get(args.sessionRequestId);
    if (!request || request.learnerUserId !== learner._id) {
      throw new ConvexError("Session request not found.");
    }
    if (request.status !== "accepted") {
      throw new ConvexError("Only accepted requests can be scheduled.");
    }

    const existingBooking = await ctx.db
      .query("bookings")
      .withIndex("by_sessionRequestId", (q) =>
        q.eq("sessionRequestId", args.sessionRequestId),
      )
      .unique();
    if (existingBooking) {
      throw new ConvexError("This session request is already scheduled.");
    }

    const slot = await ctx.db.get(args.slotId);
    if (!slot || slot.mentorUserId !== request.mentorUserId) {
      throw new ConvexError("Slot not found.");
    }
    if (slot.status !== "available") {
      throw new ConvexError("This slot is no longer available.");
    }

    const mentorProfile = await ctx.db
      .query("mentorProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", request.mentorUserId))
      .unique();
    const hourlyRate = mentorProfile?.hourlyRate;
    const expectedPrice = hourlyRate
      ? Math.round((hourlyRate * request.preferredDurationMinutes) / 60)
      : undefined;
    const now = Date.now();

    const bookingId = await ctx.db.insert("bookings", {
      sessionRequestId: request._id,
      mentorUserId: request.mentorUserId,
      learnerUserId: request.learnerUserId,
      slotId: slot._id,
      scheduledAt: slot.startTime,
      durationMinutes: request.preferredDurationMinutes,
      hourlyRateSnapshot: hourlyRate,
      expectedPrice,
      status: "scheduled",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.slotId, {
      status: "booked",
      bookingId,
      updatedAt: now,
    });

    await Promise.all([
      notifyUser(ctx, {
        userId: request.mentorUserId,
        type: "booking_scheduled",
        title: "Booking scheduled",
        message: `A session for ${request.topic} has been scheduled.`,
        linkUrl: "/bookings",
      }),
      notifyUser(ctx, {
        userId: request.learnerUserId,
        type: "booking_scheduled",
        title: "Booking scheduled",
        message: `Your session for ${request.topic} is confirmed.`,
        linkUrl: "/bookings",
      }),
    ]);

    return bookingId;
  },
});

export const listMyBookings = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewerUser(ctx);
    if (!user) {
      return [];
    }
    const [mentorBookings, learnerBookings] = await Promise.all([
      ctx.db
        .query("bookings")
        .withIndex("by_mentorUserId_scheduledAt", (q) =>
          q.eq("mentorUserId", user._id),
        )
        .collect(),
      ctx.db
        .query("bookings")
        .withIndex("by_learnerUserId_scheduledAt", (q) =>
          q.eq("learnerUserId", user._id),
        )
        .collect(),
    ]);

    const merged = [...mentorBookings, ...learnerBookings].sort(
      (a, b) => b.scheduledAt - a.scheduledAt,
    );
    const unique = merged.filter(
      (booking, index, all) =>
        all.findIndex((item) => item._id === booking._id) === index,
    );

    return await Promise.all(
      unique.map(async (booking) => {
        const [mentorUser, learnerUser, request] = await Promise.all([
          ctx.db.get(booking.mentorUserId),
          ctx.db.get(booking.learnerUserId),
          ctx.db.get(booking.sessionRequestId),
        ]);
        return { ...booking, mentorUser, learnerUser, request };
      }),
    );
  },
});

export const completeBooking = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const user = await requireViewerUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (
      !booking ||
      (booking.mentorUserId !== user._id && booking.learnerUserId !== user._id)
    ) {
      throw new ConvexError("Booking not found.");
    }
    await ctx.db.patch(args.bookingId, {
      status: "completed",
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const cancelBooking = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const user = await requireViewerUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (
      !booking ||
      (booking.mentorUserId !== user._id && booking.learnerUserId !== user._id)
    ) {
      throw new ConvexError("Booking not found.");
    }

    await ctx.db.patch(args.bookingId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
    await ctx.db.patch(booking.slotId, {
      status: "available",
      bookingId: undefined,
      updatedAt: Date.now(),
    });
    const request = await ctx.db.get(booking.sessionRequestId);
    const message = request?.topic
      ? `The booking for ${request.topic} was cancelled.`
      : "A booking was cancelled.";
    await Promise.all([
      notifyUser(ctx, {
        userId: booking.mentorUserId,
        type: "booking_cancelled",
        title: "Booking cancelled",
        message,
        linkUrl: "/bookings",
      }),
      notifyUser(ctx, {
        userId: booking.learnerUserId,
        type: "booking_cancelled",
        title: "Booking cancelled",
        message,
        linkUrl: "/bookings",
      }),
    ]);
    return { success: true };
  },
});
