"use client";

import { useMemo, useState } from "react";
import { Show, SignInButton } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionCard } from "@/components/shared/section-card";
import { DEFAULT_REQUEST_DURATIONS_MINUTES } from "@/lib/constants";
import { SESSION_FORMAT_LABELS } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function MentorDetailPage() {
  const params = useParams<{ mentorId: string }>();
  const mentorId = params.mentorId;
  const mentorUserId = mentorId ? (mentorId as Id<"users">) : null;
  const mentor = useQuery(
    api.profiles.getPublicMentorProfile,
    mentorUserId ? { userId: mentorUserId } : "skip",
  );
  const createSessionRequest = useMutation(api.sessionRequests.createSessionRequest);
  const [form, setForm] = useState({
    topic: "",
    message: "",
    preferredDurationMinutes: 60,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const mentorName = useMemo(() => {
    if (!mentor?.user) return "Mentor";
    return [mentor.user.firstName, mentor.user.lastName].filter(Boolean).join(" ") || "Mentor";
  }, [mentor]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mentorUserId) {
      setErrorMessage("This mentor link is invalid.");
      return;
    }

    const topic = form.topic.trim();
    const message = form.message.trim();
    if (!topic) {
      setErrorMessage("Add a topic before sending the request.");
      return;
    }
    if (!message) {
      setErrorMessage("Add some context so the mentor can evaluate your request.");
      return;
    }

    setSavedMessage(null);
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await createSessionRequest({
        mentorUserId: mentorUserId,
        topic,
        message,
        preferredDurationMinutes: form.preferredDurationMinutes,
      });
      setSavedMessage("Session request sent.");
      setForm({
        topic: "",
        message: "",
        preferredDurationMinutes: 60,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to send session request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mentorly-shell">
      <AppHeader />
      <main className="mentorly-page">
        {mentor === undefined ? (
          <LoadingState label="Loading mentor profile..." />
        ) : !mentorUserId || !mentor ? (
          <EmptyState
            title="Mentor not found"
            description="This mentor profile is unavailable or not active yet."
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <SectionCard
              title={mentorName}
              description={mentor.mentorProfile.headline || "Mentor profile"}
            >
              <div className="space-y-5 text-sm text-muted-foreground">
                <div className="flex flex-wrap gap-2">
                  {mentor.mentorProfile.sessionFormats.map((format) => (
                    <Badge key={format} className="bg-background/90">
                      {SESSION_FORMAT_LABELS[format]}
                    </Badge>
                  ))}
                </div>
                <p className="text-base leading-7 text-foreground/85">
                  {mentor.mentorProfile.bio || "No bio added yet."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {mentor.mentorProfile.topics.map((topic) => (
                    <Badge key={topic} className="bg-secondary/80">
                      {topic}
                    </Badge>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="mentorly-subtle-panel p-4">
                    <p className="mentorly-kicker">Experience</p>
                    <p className="mt-2 text-lg text-foreground">
                      {mentor.mentorProfile.yearsExperience
                        ? `${mentor.mentorProfile.yearsExperience} years`
                        : "Not specified"}
                    </p>
                  </div>
                  <div className="mentorly-subtle-panel p-4">
                    <p className="mentorly-kicker">Hourly rate</p>
                    <p className="mt-2 text-lg text-foreground">
                      {mentor.mentorProfile.hourlyRate
                        ? `$${mentor.mentorProfile.hourlyRate}/hr`
                        : "Ask mentor"}
                    </p>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Request a session"
              description="Send a focused session request now. Once it is accepted, scheduling continues in the bookings workspace."
            >
              <Show when="signed-out">
                <EmptyState
                  title="Sign in to request a session"
                  description="Mentorly needs your account before you can contact a mentor."
                />
                <div className="mt-4">
                  <SignInButton mode="modal">
                    <Button>Sign in</Button>
                  </SignInButton>
                </div>
              </Show>

              <Show when="signed-in">
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <Input
                    placeholder="What do you want help with?"
                    value={form.topic}
                    maxLength={120}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, topic: event.target.value }))
                    }
                  />
                  <Textarea
                    className="min-h-36"
                    placeholder="Describe your goal, context, and what you'd like from the session."
                    value={form.message}
                    maxLength={2000}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, message: event.target.value }))
                    }
                  />
                  <Select
                    value={form.preferredDurationMinutes}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        preferredDurationMinutes: Number(event.target.value),
                      }))
                    }
                  >
                    {DEFAULT_REQUEST_DURATIONS_MINUTES.map((duration) => (
                      <option key={duration} value={duration}>
                        {duration} minutes
                      </option>
                    ))}
                  </Select>
                  <div className="mentorly-subtle-panel p-4">
                    <p className="mentorly-kicker">Estimated session cost</p>
                    <p className="mt-2 text-lg text-foreground">
                      {mentor.mentorProfile.hourlyRate
                        ? `$${Math.round(
                            (mentor.mentorProfile.hourlyRate * form.preferredDurationMinutes) / 60,
                          )}`
                        : "Ask mentor"}
                    </p>
                  </div>
                  <Button size="lg" disabled={isSubmitting}>
                    {isSubmitting ? "Sending..." : "Send session request"}
                  </Button>
                  {errorMessage ? (
                    <p className="text-sm text-destructive">{errorMessage}</p>
                  ) : null}
                  {savedMessage ? (
                    <p className="text-sm text-emerald-700">{savedMessage}</p>
                  ) : null}
                </form>
              </Show>
            </SectionCard>
          </div>
        )}
      </main>
    </div>
  );
}
