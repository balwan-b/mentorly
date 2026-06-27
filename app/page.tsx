import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { AppHeader } from "@/components/shared/app-header";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="mentorly-shell text-slate-900">
      <AppHeader />
      <main className="mentorly-page relative">
        <div className="mentorly-grid pointer-events-none absolute inset-x-0 top-0 h-96" />
        <section className="relative grid gap-8 lg:grid-cols-[1.35fr_0.95fr] lg:items-center">
          <div className="space-y-6">
            <Badge className="bg-background/90">Mentor booking platform</Badge>
            <h1 className="max-w-4xl text-5xl leading-tight sm:text-6xl">
              Connect learners with mentors for focused one-on-one sessions.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Discover mentors, send focused session requests, and coordinate scheduling with
              transparent pricing and clear availability.
            </p>
            <div className="flex flex-wrap gap-3">
              <Show when="signed-out">
                <Button asChild size="lg">
                  <Link href="/sign-up">Create your account</Link>
                </Button>
              </Show>
              <Show when="signed-in">
                <Button asChild size="lg">
                  <Link href="/profile">Open your profile</Link>
                </Button>
              </Show>
              <Button asChild variant="outline" size="lg">
                <Link href="/mentors">Browse mentors</Link>
              </Button>
            </div>
            <div className="grid gap-3 pt-4 sm:grid-cols-3">
              <div className="mentorly-subtle-panel p-4">
                <p className="mentorly-kicker">Pricing</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Hourly pricing is visible from first touch.
                </p>
              </div>
              <div className="mentorly-subtle-panel p-4">
                <p className="mentorly-kicker">Requests</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Learners can send focused session requests.
                </p>
              </div>
              <div className="mentorly-subtle-panel p-4">
                <p className="mentorly-kicker">Booking</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Accepted requests turn into scheduled sessions.
                </p>
              </div>
            </div>
          </div>

          <SectionCard
            title="Simple by design"
            description="Mentorly keeps the product surface narrow so the core mentoring loop stays clear."
          >
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>Mentor and learner profiles live on the same user account.</li>
              <li>Hourly pricing is stored directly on mentor profiles.</li>
              <li>Session requests and bookings stay separate so scheduling remains clean.</li>
              <li>Notifications update both sides when requests or bookings change.</li>
            </ul>
          </SectionCard>
        </section>
      </main>
    </div>
  );
}
