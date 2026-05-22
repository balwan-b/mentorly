import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function notifyUser(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    type:
      | "system"
      | "profile"
      | "session_request_received"
      | "session_request_accepted"
      | "session_request_declined"
      | "booking_scheduled"
      | "booking_cancelled";
    title: string;
    message: string;
    linkUrl?: string;
  },
) {
  await ctx.runMutation(internal.notifications.createNotificationInternal, args);
}
