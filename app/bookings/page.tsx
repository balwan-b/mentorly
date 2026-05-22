"use client";

import { useMemo, useState } from "react";
import { Show, SignInButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionCard } from "@/components/shared/section-card";
import { BookingCard } from "@/components/bookings/booking-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export default function BookingsPage() {
  const learnerRequests = useQuery(api.sessionRequests.listMyLearnerSessionRequests, {});
  const bookings = useQuery(api.bookings.listMyBookings, {});
  const createBookingFromSessionRequest = useMutation(
    api.bookings.createBookingFromSessionRequest,
  );
  const cancelBooking = useMutation(api.bookings.cancelBooking);
  const completeBooking = useMutation(api.bookings.completeBooking);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [scheduledMessage, setScheduledMessage] = useState<string | null>(null);

  const acceptedRequests = useMemo(
    () => {
      const bookedRequestIds = new Set((bookings ?? []).map((booking) => booking.sessionRequestId));
      return (learnerRequests ?? []).filter(
        (request) =>
          request.status === "accepted" && !bookedRequestIds.has(request._id),
      );
    },
    [bookings, learnerRequests],
  );

  const currentRequestId = selectedRequestId || acceptedRequests[0]?._id;
  const availableSlots = useQuery(
    api.availability.listAvailableSlotsForSessionRequest,
    currentRequestId ? { sessionRequestId: currentRequestId as never } : "skip",
  );

  async function handleSchedule(slotId: string) {
    if (!currentRequestId) {
      return;
    }
    setScheduledMessage(null);
    await createBookingFromSessionRequest({
      sessionRequestId: currentRequestId as never,
      slotId: slotId as never,
    });
    setScheduledMessage("Session scheduled.");
  }

  return (
    <div className="mentorly-shell">
      <AppHeader />
      <main className="mentorly-page">
        <Show when="signed-out">
          <EmptyState
            title="Sign in to manage bookings"
            description="Accepted session requests and scheduled sessions live here."
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
              <p className="mentorly-kicker">Scheduling</p>
              <h1 className="mt-2 text-4xl">Bookings</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Schedule accepted requests, review upcoming sessions, and keep price expectations visible.
              </p>
            </div>
            <Badge className="bg-background/90">No payments in v1</Badge>
          </div>
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <SectionCard
              title="Schedule an accepted request"
              description="Learners can book accepted requests by choosing one of the mentor’s generated slots."
            >
              {learnerRequests === undefined ? (
                <LoadingState label="Loading accepted requests..." />
              ) : acceptedRequests.length === 0 ? (
                <EmptyState
                  title="No accepted requests yet"
                  description="Once a mentor accepts a session request, scheduling will unlock here."
                />
              ) : (
                <div className="space-y-4">
                  <Select
                    value={currentRequestId}
                    onChange={(event) => setSelectedRequestId(event.target.value)}
                  >
                    {acceptedRequests.map((request) => (
                      <option key={request._id} value={request._id}>
                        {request.topic}
                      </option>
                    ))}
                  </Select>

                  {availableSlots === undefined ? (
                    <LoadingState label="Loading available slots..." />
                  ) : availableSlots.length === 0 ? (
                    <EmptyState
                      title="No slots available"
                      description="Ask the mentor to add availability and generate slots."
                    />
                  ) : (
                    <div className="space-y-3">
                      {availableSlots.map((slot) => (
                        <div
                          key={slot._id}
                          className="mentorly-subtle-panel flex flex-wrap items-center justify-between gap-3 p-4"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {new Date(slot.startTime).toLocaleString()}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Duration determined by the accepted request
                            </p>
                          </div>
                          <Button onClick={() => void handleSchedule(slot._id)}>Book this slot</Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {scheduledMessage ? (
                    <p className="text-sm text-emerald-700">{scheduledMessage}</p>
                  ) : null}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Scheduled sessions"
              description="Both mentors and learners can track their scheduled sessions here."
            >
              {bookings === undefined ? (
                <LoadingState label="Loading bookings..." />
              ) : bookings.length === 0 ? (
                <EmptyState
                  title="No bookings yet"
                  description="Your scheduled sessions will appear once a learner books an accepted request."
                />
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => {
                    const mentorName =
                      [booking.mentorUser?.firstName, booking.mentorUser?.lastName]
                        .filter(Boolean)
                        .join(" ") || "Mentor";
                    const learnerName =
                      [booking.learnerUser?.firstName, booking.learnerUser?.lastName]
                        .filter(Boolean)
                        .join(" ") || "Learner";

                    return (
                      <BookingCard
                        key={booking._id}
                        title={booking.request?.topic || "Mentor session"}
                        subtitle={`${mentorName} · ${learnerName}`}
                        scheduledAt={booking.scheduledAt}
                        durationMinutes={booking.durationMinutes}
                        expectedPrice={booking.expectedPrice}
                        status={booking.status}
                        actions={
                          <>
                            {booking.status === "scheduled" ? (
                              <Button
                                variant="outline"
                                onClick={() => void cancelBooking({ bookingId: booking._id })}
                              >
                                Cancel
                              </Button>
                            ) : null}
                            {booking.status === "scheduled" ? (
                              <Button
                                onClick={() => void completeBooking({ bookingId: booking._id })}
                              >
                                Mark complete
                              </Button>
                            ) : null}
                          </>
                        }
                      />
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>
        </Show>
      </main>
    </div>
  );
}
