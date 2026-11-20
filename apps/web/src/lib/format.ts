/** Money is always integer paise end-to-end; format only at the edge. */
const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPaise(paise: number): string {
  return inr.format(paise / 100);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

const rtf = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto", style: "short" });

/** "4 min ago", "2 hr ago" — for queue ages and timelines. */
export function timeAgo(from: Date, now: Date = new Date()): string {
  const seconds = Math.round((from.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86400), "day");
}

const clock = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });

export function formatClock(date: Date): string {
  return clock.format(date);
}

/** Masks all but the last three digits: 98xxxxx321 — shops never see full numbers. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length < 6) return "••••";
  return `${digits.slice(0, 2)}${"x".repeat(digits.length - 5)}${digits.slice(-3)}`;
}
