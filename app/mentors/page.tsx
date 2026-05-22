"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppHeader } from "@/components/shared/app-header";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { MentorCard } from "@/components/mentors/mentor-card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function MentorsPage() {
  const [topic, setTopic] = useState("");
  const mentors = useQuery(api.profiles.listActiveMentors, {
    topic: topic.trim() || undefined,
    limit: 24,
  });

  return (
    <div className="mentorly-shell">
      <AppHeader />
      <main className="mentorly-page">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mentorly-kicker">Marketplace</p>
            <h1 className="mt-2 text-4xl">Find a mentor</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Explore active mentor profiles, compare topics and rates, then send a focused session request.
            </p>
          </div>
          <Badge className="bg-background/90">Phase 2 marketplace core</Badge>
        </div>
        <SectionCard
          title="Filter mentors"
          description="Search the current mentor list by topic or skill."
        >
          <Input
            placeholder="Filter by topic, e.g. system design"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
          />
        </SectionCard>

        <div className="mt-8">
          {mentors === undefined ? (
            <LoadingState label="Loading mentors..." />
          ) : mentors.length === 0 ? (
            <EmptyState
              title="No mentors found"
              description="Ask mentors to activate their profile or try a broader topic search."
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {mentors.map((entry) =>
                entry.user ? (
                  <MentorCard
                    key={entry.user._id}
                    mentorId={entry.user._id}
                    name={[entry.user.firstName, entry.user.lastName].filter(Boolean).join(" ") || "Mentor"}
                    headline={entry.mentorProfile.headline}
                    topics={entry.mentorProfile.topics}
                    hourlyRate={entry.mentorProfile.hourlyRate}
                    sessionFormats={entry.mentorProfile.sessionFormats}
                  />
                ) : null,
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
