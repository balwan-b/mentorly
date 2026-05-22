import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { verifyWebhook } from "@clerk/nextjs/webhooks";

const http = httpRouter();

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function firstEmail(data: Record<string, unknown>) {
  const emails = data.email_addresses;
  if (!Array.isArray(emails) || emails.length === 0) {
    return undefined;
  }

  return asString(asRecord(emails[0]).email_address);
}

http.route({
  path: "/webhooks/clerk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    if (!signingSecret) {
      return new Response("Missing CLERK_WEBHOOK_SIGNING_SECRET", { status: 500 });
    }

    let event: { type: string; data: unknown };

    try {
      event = (await verifyWebhook(request as never, {
        signingSecret,
      })) as { type: string; data: unknown };
    } catch {
      return new Response("Invalid webhook signature", { status: 400 });
    }

    const data = asRecord(event.data);

    try {
      switch (event.type) {
        case "user.created":
        case "user.updated": {
          const clerkUserId = asString(data.id);
          if (!clerkUserId) {
            break;
          }

          await ctx.runMutation(internal.sync.upsertUserFromWebhook, {
            clerkUserId,
            email: firstEmail(data),
            firstName: asString(data.first_name),
            lastName: asString(data.last_name),
            imageUrl: asString(data.image_url),
          });
          break;
        }
        case "user.deleted": {
          const clerkUserId = asString(data.id);
          if (!clerkUserId) {
            break;
          }

          await ctx.runMutation(internal.sync.deleteUserFromWebhook, {
            clerkUserId,
          });
          break;
        }
        default:
          break;
      }
    } catch {
      return new Response("Webhook processing failed", { status: 500 });
    }

    return new Response("ok", { status: 200 });
  }),
});

export default http;
