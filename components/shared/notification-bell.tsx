"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";

export function NotificationBell() {
  const unreadCount = useQuery(api.notifications.getUnreadNotificationCount, {});
  const count = unreadCount ?? 0;

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-2 text-sm shadow-sm backdrop-blur transition-colors hover:bg-accent"
    >
      Notifications
      {count > 0 ? (
        <Badge className="min-w-5 justify-center bg-primary text-primary-foreground">
          {count > 9 ? "9+" : count}
        </Badge>
      ) : null}
    </Link>
  );
}
