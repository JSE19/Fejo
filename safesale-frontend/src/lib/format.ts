export function formatNGN(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-NG").format(n);
}

export function formatSats(sats: number): string {
  return `${formatNumber(sats)} sats`;
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatCountdown(targetIso: string, now = Date.now()): string {
  const target = new Date(targetIso).getTime();
  const diff = Math.max(0, target - now);
  const totalSecs = Math.floor(diff / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (hours > 0) return `${hours}h ${mins}m ${secs.toString().padStart(2, "0")}s`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Long-form countdown — "6d 14h 22m" or "5h 12m" or "Less than a minute".
 *
 * Used for the buyer-order page auto-release countdown, which is up to
 * 7 days long and would be visually noisy with the seconds-granularity
 * version above.
 */
export function formatCountdownLong(targetIso: string, now = Date.now()): string {
  const target = new Date(targetIso).getTime();
  const diff = target - now;
  if (diff <= 0) return "now";
  const totalMins = Math.floor(diff / 60_000);
  if (totalMins < 1) return "less than a minute";
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (days === 0 && mins > 0) parts.push(`${mins}m`);
  return parts.join(" ") || `${mins}m`;
}
