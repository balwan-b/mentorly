import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SESSION_FORMAT_LABELS } from "@/lib/status";

export function MentorCard({
  mentorId,
  name,
  headline,
  topics,
  hourlyRate,
  sessionFormats,
}: {
  mentorId: string;
  name: string;
  headline?: string | null;
  topics: string[];
  hourlyRate?: number | null;
  sessionFormats: Array<"video" | "audio" | "chat">;
}) {
  return (
    <article className="mentorly-panel group overflow-hidden p-6 transition-transform hover:-translate-y-1">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mentorly-kicker">Mentor profile</p>
          <h3 className="mt-2 text-xl">{name}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {headline || "Mentor profile ready for discovery."}
          </p>
        </div>
        <div className="rounded-3xl bg-primary/10 px-4 py-3 text-right text-primary">
          <p className="text-[0.65rem] uppercase tracking-[0.26em] text-primary/70">Hourly</p>
          <p className="mt-1 text-lg font-semibold">{hourlyRate ? `$${hourlyRate}` : "Ask"}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {topics.length > 0 ? (
          topics.map((topic) => (
            <Badge
              key={topic}
              className="bg-background/90"
            >
              {topic}
            </Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">Topics will appear here.</span>
        )}
      </div>

      <p className="mt-5 text-sm text-muted-foreground">
        {sessionFormats.map((format) => SESSION_FORMAT_LABELS[format]).join(", ")}
      </p>

      <Button asChild className="mt-6">
        <Link href={`/mentors/${mentorId}`}>View profile</Link>
      </Button>
    </article>
  );
}
