/** Milliseconds left until `target` (an ISO date, or "daily" = next local midnight). */
export function remaining(target: string, now: Date): number {
  if (target === "daily") {
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
  }
  const end = Date.parse(target);
  return Number.isNaN(end) ? 0 : end - now.getTime();
}

const pad = (value: number) => String(Math.max(0, value)).padStart(2, "0");

/** "HH:MM:SS"; days are folded into hours. */
export function countdownText(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
}
