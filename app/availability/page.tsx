"use client";

import { startTransition, useEffect, useState } from "react";
import { Show, SignInButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionCard } from "@/components/shared/section-card";
import { DEFAULT_WEEKLY_AVAILABILITY } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AvailabilityPage() {
  const rules = useQuery(api.availability.listMyAvailabilityRules, {});
  const setWeeklyAvailabilityRules = useMutation(api.availability.setWeeklyAvailabilityRules);
  const generateAvailabilitySlots = useMutation(api.availability.generateAvailabilitySlots);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<
    Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
    }>
  >(DEFAULT_WEEKLY_AVAILABILITY.map((rule) => ({ ...rule })));

  useEffect(() => {
    if (rules === undefined || rules.length === 0) {
      return;
    }
    startTransition(() => {
      setRows(
        [...rules]
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
          .map((rule) => ({
            dayOfWeek: rule.dayOfWeek,
            startTime: rule.startTime,
            endTime: rule.endTime,
            isAvailable: rule.isAvailable,
          })),
      );
    });
  }, [rules]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavedMessage(null);
    await setWeeklyAvailabilityRules({ rules: rows });
    setSavedMessage("Weekly availability saved.");
  }

  async function handleGenerateSlots() {
    setSavedMessage(null);
    await generateAvailabilitySlots({ daysAhead: 14 });
    setSavedMessage("Availability slots generated for the next 14 days.");
  }

  return (
    <div className="mentorly-shell">
      <AppHeader />
      <main className="mentorly-page">
        <Show when="signed-out">
          <EmptyState
            title="Sign in to manage availability"
            description="Mentors set weekly availability here before learners can book accepted requests."
          />
          <div className="mt-4">
            <SignInButton mode="modal">
              <Button>Sign in</Button>
            </SignInButton>
          </div>
        </Show>

        <Show when="signed-in">
          {rules === undefined ? (
            <LoadingState label="Loading availability..." />
          ) : (
            <>
              <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="mentorly-kicker">Mentor operations</p>
                  <h1 className="mt-2 text-4xl">Availability</h1>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Define your weekly rhythm once, then generate bookable slots for the next two weeks.
                  </p>
                </div>
                <Badge className="bg-background/90">Simple weekly scheduling</Badge>
              </div>
              <SectionCard
                title="Weekly availability"
                description="Keep this simple: define your weekly hours, then generate two weeks of bookable slots."
              >
                <form className="space-y-4" onSubmit={handleSave}>
                  {rows.map((row, index) => (
                    <div
                      key={row.dayOfWeek}
                      className="mentorly-subtle-panel grid gap-3 p-4 md:grid-cols-[1fr_auto_auto]"
                    >
                      <label className="flex items-center gap-3 text-sm font-medium text-foreground">
                        <Checkbox
                          checked={row.isAvailable}
                          onChange={(event) =>
                            setRows((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, isAvailable: event.target.checked }
                                  : item,
                              ),
                            )
                          }
                        />
                        {DAY_LABELS[row.dayOfWeek]}
                      </label>
                      <Input
                        type="time"
                        value={row.startTime}
                        onChange={(event) =>
                          setRows((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, startTime: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <Input
                        type="time"
                        value={row.endTime}
                        onChange={(event) =>
                          setRows((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, endTime: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-3">
                    <Button size="lg">Save weekly availability</Button>
                    <Button type="button" variant="outline" size="lg" onClick={() => void handleGenerateSlots()}>
                      Generate slots
                    </Button>
                  </div>
                  {savedMessage ? <p className="text-sm text-emerald-700">{savedMessage}</p> : null}
                </form>
              </SectionCard>
            </>
          )}
        </Show>
      </main>
    </div>
  );
}
