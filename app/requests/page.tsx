"use client";

import { useState } from "react";
import { Show, SignInButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionCard } from "@/components/shared/section-card";
import { SessionRequestCard } from "@/components/requests/session-request-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function RequestsPage() {
  const learnerRequests = useQuery(api.sessionRequests.listMyLearnerSessionRequests, { limit: 25 });
  const mentorRequests = useQuery(api.sessionRequests.listMyMentorSessionRequests, { limit: 25 });
  const acceptSessionRequest = useMutation(api.sessionRequests.acceptSessionRequest);
  const declineSessionRequest = useMutation(api.sessionRequests.declineSessionRequest);
  const withdrawSessionRequest = useMutation(api.sessionRequests.withdrawSessionRequest);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function runRequestAction(actionKey: string, action: () => Promise<unknown>) {
    setErrorMessage(null);
    setPendingAction(actionKey);
    try {
      await action();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Request update failed.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="mentorly-shell">
      <AppHeader />
      <main className="mentorly-page">
        <Show when="signed-out">
          <EmptyState
            title="Sign in to manage session requests"
            description="Learners and mentors share one account workspace in Mentorly."
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
              <p className="mentorly-kicker">Request inbox</p>
              <h1 className="mt-2 text-4xl">Session requests</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Track the requests you sent as a learner and the requests you received as a mentor.
              </p>
            </div>
            <Badge className="bg-background/90">Estimated pricing included</Badge>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <SectionCard
              title="Requests you sent"
              description="As a learner, track the mentors you’ve contacted."
            >
              {errorMessage ? <p className="mb-4 text-sm text-destructive">{errorMessage}</p> : null}
              {learnerRequests === undefined ? (
                <LoadingState label="Loading learner requests..." />
              ) : learnerRequests.length === 0 ? (
                <EmptyState
                  title="No requests sent yet"
                  description="Visit mentor profiles and send your first session request."
                />
              ) : (
                <div className="space-y-4">
                  {learnerRequests.map((request) => (
                    <SessionRequestCard
                      key={request._id}
                      title={
                        [request.mentorUser?.firstName, request.mentorUser?.lastName]
                          .filter(Boolean)
                          .join(" ") || "Mentor"
                      }
                      subtitle={request.mentorProfile?.headline || "Mentor"}
                      topic={request.topic}
                      message={request.message}
                      durationMinutes={request.preferredDurationMinutes}
                      expectedPrice={request.expectedPrice}
                      status={request.status}
                      actions={
                        request.status === "submitted" ? (
                          <Button
                            variant="outline"
                            disabled={pendingAction === `withdraw:${request._id}`}
                            onClick={() =>
                              void runRequestAction(`withdraw:${request._id}`, () =>
                                withdrawSessionRequest({ requestId: request._id }),
                              )
                            }
                          >
                            {pendingAction === `withdraw:${request._id}` ? "Withdrawing..." : "Withdraw"}
                          </Button>
                        ) : null
                      }
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Requests you received"
              description="As a mentor, review incoming requests and decide whether to continue."
            >
              {mentorRequests === undefined ? (
                <LoadingState label="Loading mentor requests..." />
              ) : mentorRequests.length === 0 ? (
                <EmptyState
                  title="No inbound requests yet"
                  description="Once your mentor profile is active, learner requests will appear here."
                />
              ) : (
                <div className="space-y-4">
                  {mentorRequests.map((request) => (
                    <SessionRequestCard
                      key={request._id}
                      title={
                        [request.learnerUser?.firstName, request.learnerUser?.lastName]
                          .filter(Boolean)
                          .join(" ") || "Learner"
                      }
                      subtitle="Learner request"
                      topic={request.topic}
                      message={request.message}
                      durationMinutes={request.preferredDurationMinutes}
                      expectedPrice={request.expectedPrice}
                      status={request.status}
                      actions={
                        request.status === "submitted" ? (
                          <>
                            <Button
                              disabled={pendingAction === `accept:${request._id}`}
                              onClick={() =>
                                void runRequestAction(`accept:${request._id}`, () =>
                                  acceptSessionRequest({ requestId: request._id }),
                                )
                              }
                            >
                              {pendingAction === `accept:${request._id}` ? "Accepting..." : "Accept"}
                            </Button>
                            <Button
                              variant="outline"
                              disabled={pendingAction === `decline:${request._id}`}
                              onClick={() =>
                                void runRequestAction(`decline:${request._id}`, () =>
                                  declineSessionRequest({ requestId: request._id }),
                                )
                              }
                            >
                              {pendingAction === `decline:${request._id}` ? "Declining..." : "Decline"}
                            </Button>
                          </>
                        ) : null
                      }
                    />
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </Show>
      </main>
    </div>
  );
}
