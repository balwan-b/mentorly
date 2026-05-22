import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

export async function requireIdentity(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("You must be signed in to perform this action.");
  }
  return identity;
}

export async function getViewerUser(ctx: Ctx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const byTokenIdentifier = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();

  if (byTokenIdentifier) {
    return byTokenIdentifier;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
}

export async function requireViewerUser(ctx: Ctx): Promise<Doc<"users">> {
  const user = await getViewerUser(ctx);
  if (!user) {
    throw new ConvexError("User profile is not initialized yet.");
  }
  return user;
}

export async function getOrCreateViewerUser(ctx: MutationCtx): Promise<Doc<"users">> {
  const identity = await requireIdentity(ctx);
  const existingByTokenIdentifier = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();

  if (existingByTokenIdentifier) {
    return existingByTokenIdentifier;
  }

  const existingByClerkUserId = await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
    .unique();

  if (existingByClerkUserId) {
    await ctx.db.patch(existingByClerkUserId._id, {
      tokenIdentifier: identity.tokenIdentifier,
      updatedAt: Date.now(),
    });
    const updated = await ctx.db.get(existingByClerkUserId._id);
    if (!updated) {
      throw new ConvexError("User profile disappeared during authentication.");
    }
    return updated;
  }

  const now = Date.now();
  const userId = await ctx.db.insert("users", {
    clerkUserId: identity.subject,
    tokenIdentifier: identity.tokenIdentifier,
    email: identity.email ?? undefined,
    firstName: identity.givenName ?? undefined,
    lastName: identity.familyName ?? undefined,
    imageUrl: identity.pictureUrl ?? undefined,
    unreadNotificationCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  const user = await ctx.db.get(userId);
  if (!user) {
    throw new ConvexError("Failed to create the user profile.");
  }

  return user;
}
