export function getPeriodRange(reviewType: "weekly" | "monthly") {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - (reviewType === "weekly" ? 6 : 29));
  const start = startDate.toISOString().slice(0, 10);

  return { start, end };
}
