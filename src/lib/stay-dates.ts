/** Default check-in/out time when user leaves time blank (noon avoids conflicting with typical flight times). */
const DEFAULT_CHECK_IN_TIME = "12:00";
const DEFAULT_CHECK_OUT_TIME = "12:00";

export function parseCheckInDateTime(
  datePart: string | undefined,
  timePart: string | undefined,
  fallback: Date
): Date {
  if (!datePart?.trim()) return fallback;
  if (datePart.includes("T")) return new Date(datePart);
  const time = timePart?.trim() || DEFAULT_CHECK_IN_TIME;
  const d = new Date(`${datePart}T${time}:00`);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export function parseCheckOutDateTime(
  datePart: string | undefined,
  timePart: string | undefined,
  fallback: Date
): Date {
  if (!datePart?.trim()) return fallback;
  if (datePart.includes("T")) return new Date(datePart);
  const time = timePart?.trim() || DEFAULT_CHECK_OUT_TIME;
  const d = new Date(`${datePart}T${time}:00`);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toTimeInputValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatStayDateTimeRange(checkIn: Date, checkOut: Date) {
  const inDate = toDateInputValue(checkIn);
  const outDate = toDateInputValue(checkOut);
  const inTime = toTimeInputValue(checkIn);
  const outTime = toTimeInputValue(checkOut);
  const showInTime = inTime !== DEFAULT_CHECK_IN_TIME;
  const showOutTime = outTime !== DEFAULT_CHECK_OUT_TIME;
  return `${inDate}${showInTime ? ` at ${inTime}` : ""} – ${outDate}${showOutTime ? ` at ${outTime}` : ""}`;
}

export function isDefaultCheckInTime(date: Date) {
  return toTimeInputValue(date) === DEFAULT_CHECK_IN_TIME;
}

export function isDefaultCheckOutTime(date: Date) {
  return toTimeInputValue(date) === DEFAULT_CHECK_OUT_TIME;
}

export { DEFAULT_CHECK_IN_TIME, DEFAULT_CHECK_OUT_TIME };
