"use client";

import React, { useMemo } from "react";
import { generateHourlySlots, getDisableReason, OPERATING_START_HOUR, OPERATING_END_HOUR, READY_BUFFER_HOURS } from "@/features/orders/utils/pickup";

export interface PickupScheduleValue {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (start time only)
}

interface PickupScheduleSelectorProps {
  earliestAvailableDate: Date | string;
  isReadyOnlyOrder: boolean;
  value?: PickupScheduleValue;
  onChange?: (val: PickupScheduleValue) => void;
  bufferHours?: number;
  startHour?: number;
  endHour?: number;
  disabled?: boolean;
}

// Lightweight selector for pickup date and hourly start time (09:00–20:00)
export const PickupScheduleSelector: React.FC<PickupScheduleSelectorProps> = ({
  earliestAvailableDate,
  isReadyOnlyOrder,
  value,
  onChange,
  bufferHours = READY_BUFFER_HOURS,
  startHour = OPERATING_START_HOUR,
  endHour = OPERATING_END_HOUR,
  disabled = false,
}) => {
  const now = useMemo(() => new Date(), []);
  const earliest = useMemo(() => {
    if (earliestAvailableDate instanceof Date) return earliestAvailableDate;
    // Expecting YYYY-MM-DD or ISO
    const s = String(earliestAvailableDate);
    const isoLike = s.match(/^\d{4}-\d{2}-\d{2}$/) ? `${s}T00:00:00` : s;
    const d = new Date(isoLike);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [earliestAvailableDate]);

  const slots = useMemo(() => generateHourlySlots(startHour, endHour), [startHour, endHour]);

  const dateStr = value?.date ?? "";
  const timeStr = value?.time ?? "";

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { date: e.target.value, time: timeStr };
    onChange?.(next);
  };
  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = { date: dateStr, time: e.target.value };
    onChange?.(next);
  };

  const minDateAttr = useMemo(() => {
    const y = earliest.getFullYear();
    const m = String(earliest.getMonth() + 1).padStart(2, "0");
    const d = String(earliest.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [earliest]);

  const helpText = useMemo(() => {
    if (!dateStr || !timeStr) return "Pilih tanggal dan jam mulai pickup.";
    const selectedDate = new Date(`${dateStr}T00:00:00`);
    const reason = getDisableReason({
      selectedDate,
      now,
      earliestAvailableDate: earliest,
      startTimeHHmm: timeStr,
      isReadyOnlyOrder,
      bufferHours,
    });
    switch (reason) {
      case "before_earliest_date":
        return "Tidak boleh sebelum tanggal earliest pickup.";
      case "outside_operating_hours":
        return "Di luar jam operasional (09:00–20:00).";
      case "insufficient_buffer":
        return `Same-day Ready perlu buffer ${bufferHours} jam dari sekarang.`;
      default:
        return "Jadwal valid. Lanjutkan pembayaran atau simpan jadwal.";
    }
  }, [dateStr, timeStr, earliest, now, isReadyOnlyOrder, bufferHours]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Tanggal Pickup</label>
          <input
            type="date"
            min={minDateAttr}
            value={dateStr}
            onChange={handleDateChange}
            disabled={disabled}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Jam Mulai</label>
          <select
            value={timeStr}
            onChange={handleTimeChange}
            disabled={disabled || !dateStr}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="" disabled>
              Pilih jam (HH:mm)
            </option>
            {slots.map((hhmm) => {
              const selectedDate = dateStr ? new Date(`${dateStr}T00:00:00`) : now;
              const reason = dateStr
                ? getDisableReason({
                    selectedDate,
                    now,
                    earliestAvailableDate: earliest,
                    startTimeHHmm: hhmm,
                    isReadyOnlyOrder,
                    bufferHours,
                  })
                : "before_earliest_date";
              const disabledOpt = reason !== null;
              return (
                <option key={hhmm} value={hhmm} disabled={disabledOpt}>
                  {hhmm}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{helpText}</p>
      <p className="text-xs text-gray-500">Operasional: 09:00–20:00 • Durasi slot: 1 jam</p>
    </div>
  );
};

export default PickupScheduleSelector;

