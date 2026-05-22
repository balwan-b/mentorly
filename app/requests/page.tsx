"use client";

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
  const learnerRequests = useQuery(api.sessionRequests.listMyLearnerSessionRequests, {});
  const mentorRequests = useQuery(api.sessionRequests.listMyMentorSessionRequests, {});
  const acceptSessionRequest = useMutation(api.sessionRequests.acceptSessionRequest);
  const declineSessionRequest = useMutation(api.sessionRequests.declineSessionRequest);
  const withdrawSessionRequest = useMutation(api.sessionRequests.withdrawSessionRequest);

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
                          <button
                            className="rounded-full border border-slate-300 px-4 py-2 text-sm"
                            onClick={() => void withdrawSessionRequest({ requestId: request._id })}
                          >
                            Withdraw
                          </button>
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
                            <button
                              className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
                              onClick={() => void acceptSessionRequest({ requestId: request._id })}
                            >
                              Accept
                            </button>
                            <button
                              className="rounded-full border border-slate-300 px-4 py-2 text-sm"
                              onClick={() => void declineSessionRequest({ requestId: request._id })}
                            >
                              Decline
                            </button>
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
