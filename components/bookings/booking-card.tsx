import { Badge } from "@/components/ui/badge";
import { formatLocalDateTime } from "@/lib/date";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/status";

export function BookingCard({
  title,
  subtitle,
  scheduledAt,
  durationMinutes,
  expectedPrice,
  status,
  actions,
}: {
  title: string;
  subtitle: string;
  scheduledAt: number;
  durationMinutes: number;
  expectedPrice?: number;
  status: BookingStatus;
  actions?: React.ReactNode;
}) {
  return (
    <article className="mentorly-panel p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mentorly-kicker">Scheduled session</p>
          <h3 className="mt-2 text-lg">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Badge className="bg-background/90">
          {BOOKING_STATUS_LABELS[status]}
        </Badge>
      </div>
      <p className="mt-4 text-sm text-foreground/90">
        {formatLocalDateTime(scheduledAt)}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{durationMinutes} minutes</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {expectedPrice ? `Expected price: $${expectedPrice}` : "Price not set"}
      </p>
      {actions ? <div className="mt-5 flex flex-wrap gap-3">{actions}</div> : null}
    </article>
  );
}
