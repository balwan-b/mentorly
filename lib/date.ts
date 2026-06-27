export function formatLocalDateTime(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZoneName: "short",
  }).format(new Date(value));
}

export function getLocalTimeZoneLabel() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
