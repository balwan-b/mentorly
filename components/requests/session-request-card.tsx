import { SESSION_REQUEST_STATUS_LABELS, type SessionRequestStatus } from "@/lib/status";

export function SessionRequestCard({
  title,
  subtitle,
  topic,
  message,
  durationMinutes,
  expectedPrice,
  status,
  actions,
}: {
  title: string;
  subtitle: string;
  topic: string;
  message: string;
  durationMinutes: number;
  expectedPrice?: number;
  status: SessionRequestStatus;
  actions?: React.ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {SESSION_REQUEST_STATUS_LABELS[status]}
        </span>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-800">{topic}</p>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      <p className="mt-4 text-sm text-slate-500">{durationMinutes} minutes</p>
      <p className="mt-2 text-sm text-slate-500">
        {expectedPrice ? `Estimated cost: $${expectedPrice}` : "Estimated cost not available"}
      </p>
      {actions ? <div className="mt-5 flex flex-wrap gap-3">{actions}</div> : null}
    </article>
  );
}
