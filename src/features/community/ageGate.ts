export function isAdultDate(
  value: string,
  today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()),
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value ||
    value > today
  )
    return false;
  const [year, month, day] = value.split("-").map(Number);
  const [currentYear, currentMonth, currentDay] = today.split("-").map(Number);
  const age =
    currentYear -
    year -
    (currentMonth < month || (currentMonth === month && currentDay < day)
      ? 1
      : 0);
  return age >= 18 && age <= 120;
}
