export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="mentorly-subtle-panel flex items-center gap-3 p-5 text-sm text-muted-foreground">
      <span className="size-2 animate-pulse rounded-full bg-primary" />
      {label}
    </div>
  );
}
