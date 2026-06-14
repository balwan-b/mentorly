"use client";

import Link from "next/link";
import { useState } from "react";
import { Show, SignInButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatLocalDateTime } from "@/lib/date";

export default function NotificationsPage() {
  const notifications = useQuery(api.notifications.listMyNotifications, { limit: 50 });
  const markNotificationRead = useMutation(api.notifications.markNotificationRead);
  const markAllNotificationsRead = useMutation(api.notifications.markAllNotificationsRead);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function runNotificationAction(actionKey: string, action: () => Promise<unknown>) {
    setErrorMessage(null);
    setPendingAction(actionKey);
    try {
      await action();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Notification update failed.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="mentorly-shell">
      <AppHeader />
      <main className="mentorly-page max-w-4xl">
        <Show when="signed-out">
          <EmptyState
            title="Sign in to view notifications"
            description="Mentorly will keep request and booking updates here in real time."
          />
          <div className="mt-4">
            <SignInButton mode="modal">
              <Button>Sign in</Button>
            </SignInButton>
          </div>
        </Show>

        <Show when="signed-in">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mentorly-kicker">Realtime updates</p>
              <h1 className="mt-2 text-4xl">Notifications</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Stay on top of request decisions and booking changes without polling around the app.
              </p>
            </div>
            <Badge className="bg-background/90">Convex powered</Badge>
          </div>
          <SectionCard
            title="Notifications"
            description="Updates from requests and bookings appear here automatically."
          >
            {errorMessage ? <p className="mb-4 text-sm text-destructive">{errorMessage}</p> : null}
            {notifications === undefined ? (
              <LoadingState label="Loading notifications..." />
            ) : notifications.length === 0 ? (
              <EmptyState
                title="No notifications yet"
                description="As soon as requests and bookings change state, updates will show up here."
              />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    disabled={pendingAction === "mark-all"}
                    onClick={() =>
                      void runNotificationAction("mark-all", () =>
                        markAllNotificationsRead({}),
                      )
                    }
                  >
                    {pendingAction === "mark-all" ? "Marking..." : "Mark all read"}
                  </Button>
                </div>
                {notifications.map((notification) => (
                  <article
                    key={notification._id}
                    className="mentorly-subtle-panel p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold">{notification.title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">{notification.message}</p>
                        {notification.linkUrl ? (
                          <p className="mt-3 text-sm">
                            <Link className="text-primary underline-offset-4 hover:underline" href={notification.linkUrl}>
                              Open related page
                            </Link>
                          </p>
                        ) : null}
                        <p className="mt-3 text-xs text-muted-foreground">
                          {formatLocalDateTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pendingAction === `read:${notification._id}`}
                          onClick={() =>
                            void runNotificationAction(`read:${notification._id}`, () =>
                              markNotificationRead({ notificationId: notification._id }),
                            )
                          }
                        >
                          {pendingAction === `read:${notification._id}` ? "Marking..." : "Mark read"}
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </Show>
      </main>
    </div>
  );
}
