"use client";

import { startTransition, useEffect, useState } from "react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionCard } from "@/components/shared/section-card";
import { DEFAULT_SESSION_FORMATS, DEFAULT_TOPIC_SUGGESTIONS } from "@/lib/constants";
import { SESSION_FORMATS, SESSION_FORMAT_LABELS, type SessionFormat } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function joinTopics(value: string[]) {
  return value.join(", ");
}

export default function ProfilePage() {
  const profile = useQuery(api.profiles.getMyProfile, {});
  const upsertMentorProfile = useMutation(api.profiles.upsertMentorProfile);
  const upsertLearnerProfile = useMutation(api.profiles.upsertLearnerProfile);

  const [mentorForm, setMentorForm] = useState({
    headline: "",
    bio: "",
    topics: "",
    yearsExperience: "",
    hourlyRate: "",
    sessionFormats: DEFAULT_SESSION_FORMATS as SessionFormat[],
    isActive: false,
  });
  const [learnerForm, setLearnerForm] = useState({
    goals: "",
    bio: "",
  });
  const [mentorSaved, setMentorSaved] = useState<string | null>(null);
  const [learnerSaved, setLearnerSaved] = useState<string | null>(null);

  useEffect(() => {
    if (profile === undefined) {
      return;
    }

    startTransition(() => {
      setMentorForm({
        headline: profile?.mentorProfile?.headline ?? "",
        bio: profile?.mentorProfile?.bio ?? "",
        topics: joinTopics(profile?.mentorProfile?.topics ?? []),
        yearsExperience: profile?.mentorProfile?.yearsExperience?.toString() ?? "",
        hourlyRate: profile?.mentorProfile?.hourlyRate?.toString() ?? "",
        sessionFormats:
          profile?.mentorProfile?.sessionFormats ?? DEFAULT_SESSION_FORMATS,
        isActive: profile?.mentorProfile?.isActive ?? false,
      });
      setLearnerForm({
        goals: profile?.learnerProfile?.goals ?? "",
        bio: profile?.learnerProfile?.bio ?? "",
      });
    });
  }, [profile]);

  async function handleMentorSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMentorSaved(null);
    await upsertMentorProfile({
      headline: mentorForm.headline || undefined,
      bio: mentorForm.bio || undefined,
      topics: mentorForm.topics
        .split(",")
        .map((topic) => topic.trim())
        .filter(Boolean),
      yearsExperience: mentorForm.yearsExperience
        ? Number(mentorForm.yearsExperience)
        : undefined,
      hourlyRate: mentorForm.hourlyRate ? Number(mentorForm.hourlyRate) : undefined,
      sessionFormats: mentorForm.sessionFormats,
      isActive: mentorForm.isActive,
    });
    setMentorSaved("Mentor profile saved.");
  }

  async function handleLearnerSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLearnerSaved(null);
    await upsertLearnerProfile({
      goals: learnerForm.goals || undefined,
      bio: learnerForm.bio || undefined,
    });
    setLearnerSaved("Learner profile saved.");
  }

  return (
    <div className="mentorly-shell">
      <AppHeader />
      <main className="mentorly-page">
        <Show when="signed-out">
          <EmptyState
            title="Sign in to edit your profile"
            description="Mentorly uses one account for both mentor and learner profiles."
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
              <p className="mentorly-kicker">Identity workspace</p>
              <h1 className="mt-2 text-4xl">Your profile workspace</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Update your mentor identity and your learner context from one place.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-background/90">Mentor + learner on one account</Badge>
              <UserButton />
            </div>
          </div>

          {profile === undefined ? (
            <LoadingState label="Loading your profile..." />
          ) : (
            <>
              {!profile ? (
                <div className="mb-6">
                  <EmptyState
                    title="Start your profile"
                    description="Your Convex user record will be created automatically the first time you save either section."
                  />
                </div>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-2">
                <SectionCard
                  title="Mentor profile"
                  description="This is the public side learners will eventually discover."
                >
                  <form className="space-y-4" onSubmit={handleMentorSubmit}>
                  <Input
                    placeholder="Headline"
                    value={mentorForm.headline}
                    onChange={(event) =>
                      setMentorForm((current) => ({
                        ...current,
                        headline: event.target.value,
                      }))
                    }
                  />
                  <Textarea
                    className="min-h-32"
                    placeholder="Bio"
                    value={mentorForm.bio}
                    onChange={(event) =>
                      setMentorForm((current) => ({
                        ...current,
                        bio: event.target.value,
                      }))
                    }
                  />
                  <Input
                    placeholder="Topics, comma separated"
                    value={mentorForm.topics}
                    onChange={(event) =>
                      setMentorForm((current) => ({
                        ...current,
                        topics: event.target.value,
                      }))
                    }
                  />
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    {DEFAULT_TOPIC_SUGGESTIONS.map((topic) => (
                      <Badge key={topic} className="bg-background/90">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      placeholder="Years of experience"
                      type="number"
                      min="0"
                      value={mentorForm.yearsExperience}
                      onChange={(event) =>
                        setMentorForm((current) => ({
                          ...current,
                          yearsExperience: event.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="Hourly rate"
                      type="number"
                      min="0"
                      value={mentorForm.hourlyRate}
                      onChange={(event) =>
                        setMentorForm((current) => ({
                          ...current,
                          hourlyRate: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-foreground">Session formats</p>
                    <div className="flex flex-wrap gap-3">
                      {SESSION_FORMATS.map((format) => {
                        const checked = mentorForm.sessionFormats.includes(format);
                        return (
                          <label
                            key={format}
                            className="flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-4 py-2 text-sm shadow-sm"
                          >
                            <Checkbox
                              checked={checked}
                              onChange={(event) =>
                                setMentorForm((current) => ({
                                  ...current,
                                  sessionFormats: event.target.checked
                                    ? Array.from(new Set([...current.sessionFormats, format]))
                                    : current.sessionFormats.filter((item) => item !== format),
                                }))
                              }
                            />
                            {SESSION_FORMAT_LABELS[format]}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <label className="flex items-center gap-3 text-sm text-foreground">
                    <Checkbox
                      checked={mentorForm.isActive}
                      onChange={(event) =>
                        setMentorForm((current) => ({
                          ...current,
                          isActive: event.target.checked,
                        }))
                      }
                    />
                    Show this mentor profile in future discovery pages
                  </label>
                    <Button size="lg">Save mentor profile</Button>
                    {mentorSaved ? <p className="text-sm text-emerald-700">{mentorSaved}</p> : null}
                  </form>
                </SectionCard>

                <SectionCard
                  title="Learner profile"
                  description="This gives mentors context about what you want help with."
                >
                  <form className="space-y-4" onSubmit={handleLearnerSubmit}>
                  <Textarea
                    className="min-h-32"
                    placeholder="What are you trying to learn or improve?"
                    value={learnerForm.goals}
                    onChange={(event) =>
                      setLearnerForm((current) => ({
                        ...current,
                        goals: event.target.value,
                      }))
                    }
                  />
                  <Textarea
                    className="min-h-32"
                    placeholder="Optional bio"
                    value={learnerForm.bio}
                    onChange={(event) =>
                      setLearnerForm((current) => ({
                        ...current,
                        bio: event.target.value,
                      }))
                    }
                  />
                    <Button size="lg">Save learner profile</Button>
                    {learnerSaved ? <p className="text-sm text-emerald-700">{learnerSaved}</p> : null}
                  </form>
                </SectionCard>
              </div>
            </>
          )}
        </Show>
      </main>
    </div>
  );
}
