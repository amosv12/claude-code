/** Get the Monday of the week containing the given date */
export function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return formatDate(d);
}

/** Get the Friday of the week containing the given date */
export function getWeekEnd(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -2 : 5);
  d.setDate(diff);
  return formatDate(d);
}

/** Get next week's Monday */
export function getNextWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() + (day === 0 ? 1 : 8 - day);
  d.setDate(diff);
  return formatDate(d);
}

/** Get next week's Friday */
export function getNextWeekEnd(date: Date = new Date()): string {
  const start = new Date(getNextWeekStart(date));
  start.setDate(start.getDate() + 4);
  return formatDate(start);
}

/** Format date as YYYY-MM-DD */
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/** Format date for display: "Monday, March 16, 2026" */
export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

/** Format short date: "Mon, Mar 16" */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

/** Format time for display: "10:00 AM ET" */
export function formatTimeDisplay(timeStr: string | null): string {
  if (!timeStr) return "TBD";
  const [hours, minutes] = timeStr.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${ampm} ET`;
}

/** Get all dates (YYYY-MM-DD) for a week starting on Monday */
export function getWeekDates(mondayStr: string): string[] {
  const dates: string[] = [];
  const monday = new Date(mondayStr + "T12:00:00");
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

/** Get ISO datetime string for now */
export function nowISO(): string {
  return new Date().toISOString();
}
