import { ConvexError } from "convex/values";

const MIN_DURATION_MINUTES = 15;
const MAX_DURATION_MINUTES = 240;
const MAX_TOPIC_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HEADLINE_LENGTH = 140;
const MAX_BIO_LENGTH = 4000;
const MAX_GOALS_LENGTH = 2000;
const MAX_TOPICS = 12;
const MAX_TOPIC_ITEM_LENGTH = 40;

export function clampQueryLimit(value: number | undefined, defaultValue: number, maxValue: number) {
  return Math.max(1, Math.min(value ?? defaultValue, maxValue));
}

export function ensureNonEmptyTrimmed(value: string, fieldName: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ConvexError(`${fieldName} is required.`);
  }
  return trimmed;
}

export function ensureMaxLength(value: string | undefined, maxLength: number, fieldName: string) {
  if (value && value.length > maxLength) {
    throw new ConvexError(`${fieldName} must be ${maxLength} characters or fewer.`);
  }
}

export function validateSessionRequestInput(args: {
  topic: string;
  message: string;
  preferredDurationMinutes: number;
  preferredStart?: number;
  preferredEnd?: number;
}) {
  const topic = ensureNonEmptyTrimmed(args.topic, "Topic");
  const message = ensureNonEmptyTrimmed(args.message, "Message");

  ensureMaxLength(topic, MAX_TOPIC_LENGTH, "Topic");
  ensureMaxLength(message, MAX_MESSAGE_LENGTH, "Message");

  if (
    !Number.isInteger(args.preferredDurationMinutes) ||
    args.preferredDurationMinutes < MIN_DURATION_MINUTES ||
    args.preferredDurationMinutes > MAX_DURATION_MINUTES
  ) {
    throw new ConvexError(
      `Preferred duration must be between ${MIN_DURATION_MINUTES} and ${MAX_DURATION_MINUTES} minutes.`,
    );
  }

  if (
    args.preferredStart !== undefined &&
    args.preferredEnd !== undefined &&
    args.preferredEnd < args.preferredStart
  ) {
    throw new ConvexError("Preferred end time cannot be earlier than start time.");
  }

  return { topic, message };
}

export function validateMoneyAmount(value: number | undefined, fieldName: string) {
  if (value === undefined) {
    return;
  }
  if (!Number.isFinite(value) || value < 0 || value > 10000) {
    throw new ConvexError(`${fieldName} must be between 0 and 10000.`);
  }
}

export function validateNonNegativeInteger(value: number | undefined, fieldName: string, maxValue: number) {
  if (value === undefined) {
    return;
  }
  if (!Number.isInteger(value) || value < 0 || value > maxValue) {
    throw new ConvexError(`${fieldName} must be a whole number between 0 and ${maxValue}.`);
  }
}

export function normalizeTopics(topics?: string[]) {
  const normalized = (topics ?? [])
    .map((topic) => topic.trim())
    .filter(Boolean)
    .slice(0, MAX_TOPICS);

  for (const topic of normalized) {
    ensureMaxLength(topic, MAX_TOPIC_ITEM_LENGTH, "Topic");
  }

  return Array.from(new Set(normalized));
}

export function validateProfileFields(args: {
  headline?: string;
  bio?: string;
  goals?: string;
}) {
  ensureMaxLength(args.headline?.trim(), MAX_HEADLINE_LENGTH, "Headline");
  ensureMaxLength(args.bio?.trim(), MAX_BIO_LENGTH, "Bio");
  ensureMaxLength(args.goals?.trim(), MAX_GOALS_LENGTH, "Goals");
}

export function isValidTimeString(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

export function ensureValidTimeZone(value: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
  } catch {
    throw new ConvexError("A valid IANA time zone is required.");
  }
}

export function validateAvailabilityRules(
  rules: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }>,
) {
  if (rules.length !== 7) {
    throw new ConvexError("Weekly availability must include exactly 7 day entries.");
  }

  const seenDays = new Set<number>();
  for (const rule of rules) {
    if (!Number.isInteger(rule.dayOfWeek) || rule.dayOfWeek < 0 || rule.dayOfWeek > 6) {
      throw new ConvexError("Day of week must be between 0 and 6.");
    }
    if (seenDays.has(rule.dayOfWeek)) {
      throw new ConvexError("Each day of the week can only appear once.");
    }
    seenDays.add(rule.dayOfWeek);

    if (!isValidTimeString(rule.startTime) || !isValidTimeString(rule.endTime)) {
      throw new ConvexError("Availability times must use HH:MM format.");
    }
    if (rule.startTime >= rule.endTime) {
      throw new ConvexError("Availability start time must be earlier than end time.");
    }
  }
}
