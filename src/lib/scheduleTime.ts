// Helpers for <input type="datetime-local">, whose value has no time zone and
// is read as the browser's local time.

const pad = (n: number) => String(n).padStart(2, '0');

/** Input value for a date, in local time. */
export function toLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Input value for a date, rounded up to the next quarter hour (the scheduler's granularity). */
export function toQuarterHourInput(date: Date): string {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  rounded.setMinutes(Math.ceil(rounded.getMinutes() / 15) * 15);
  return toLocalInput(rounded);
}

/** Default for a new schedule: tomorrow at 5 pm. */
export function defaultScheduleInput(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(17, 0, 0, 0);
  return toLocalInput(date);
}

/** ISO timestamp for an input value, or null when it's empty or invalid. */
export function localInputToIso(value: string): string | null {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

/** Returns a problem with the chosen time, or null when it's usable. */
export function scheduleProblem(value: string): string | null {
  const iso = localInputToIso(value);
  if (!iso) return 'Pick a date and time for the Instagram post.';
  if (new Date(iso).getTime() <= Date.now()) return 'The Instagram post’s scheduled time has already passed.';
  return null;
}

export const formatScheduled = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
