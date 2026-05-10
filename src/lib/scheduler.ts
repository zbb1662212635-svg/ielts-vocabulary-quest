export function scheduleNextReview(
  currentIntervalDays: number,
  result: "again" | "hard" | "good" | "easy",
): number {
  if (result === "again") return 1;
  if (result === "hard") return Math.max(1, currentIntervalDays);
  if (result === "good") {
    return currentIntervalDays === 0 ? 2 : currentIntervalDays * 2;
  }
  if (result === "easy") {
    return currentIntervalDays === 0 ? 4 : currentIntervalDays * 3;
  }
  return 1;
}

export function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}
