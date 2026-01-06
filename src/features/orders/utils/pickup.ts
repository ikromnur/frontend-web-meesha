// Utility functions for pickup scheduling logic
// Operating hours: 09:00–20:00 (inclusive start, exclusive end)

export const OPERATING_START_HOUR = 9;
export const OPERATING_END_HOUR = 20; // last slot starts at 19:00, ends at 20:00
export const READY_BUFFER_HOURS = 3;

// Generate hourly start times as strings 'HH:mm' from startHour to endHour-1
export function generateHourlySlots(
  startHour: number = OPERATING_START_HOUR,
  endHour: number = OPERATING_END_HOUR
): string[] {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    const hh = String(h).padStart(2, "0");
    slots.push(`${hh}:00`);
  }
  return slots;
}

export function isOperatingHour(startTimeHHmm: string): boolean {
  const m = startTimeHHmm.match(/^(\d{2}):(\d{2})$/);
  if (!m) return false;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false;
  return hh >= OPERATING_START_HOUR && hh < OPERATING_END_HOUR && mm === 0;
}

export function ceilToNextHour(date: Date): Date {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

// Returns threshold start time 'HH:mm' for same-day Ready buffer (ceil(now + bufferHours) to next hour)
export function getSameDayBufferThreshold(
  now: Date,
  bufferHours: number = READY_BUFFER_HOURS
): string {
  const t = new Date(now.getTime());
  t.setHours(t.getHours() + bufferHours);
  const ceil = ceilToNextHour(t);
  const hh = String(ceil.getHours()).padStart(2, "0");
  return `${hh}:00`;
}

// Determine if a given selection should be disabled and why
export function getDisableReason(params: {
  selectedDate: Date;
  now: Date;
  earliestAvailableDate: Date; // order createdAt + max(leadTimeDays)
  startTimeHHmm: string;
  isReadyOnlyOrder: boolean; // true if max lead time is 0
  bufferHours?: number;
}):
  | "before_earliest_date"
  | "outside_operating_hours"
  | "insufficient_buffer"
  | null {
  const {
    selectedDate,
    now,
    earliestAvailableDate,
    startTimeHHmm,
    isReadyOnlyOrder,
    bufferHours = READY_BUFFER_HOURS,
  } = params;

  // Compare only date portion
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  if (ymd(selectedDate) < ymd(earliestAvailableDate))
    return "before_earliest_date";

  if (!isOperatingHour(startTimeHHmm)) return "outside_operating_hours";

  const isSameDay = ymd(selectedDate) === ymd(now);
  if (isReadyOnlyOrder && isSameDay) {
    const threshold = getSameDayBufferThreshold(now, bufferHours);
    // Disable if selected start time is strictly before threshold
    const hhSelected = Number(startTimeHHmm.split(":")[0]);
    const hhThreshold = Number(threshold.split(":")[0]);
    if (hhSelected < hhThreshold) return "insufficient_buffer";
  }
  return null;
}
