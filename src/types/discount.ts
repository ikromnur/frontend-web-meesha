export type Discount = {
  id: string;
  code: string;
  value: number;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  // New normalized fields from backend
  startDate?: string; // ISO string
  startDateMs?: number; // epoch milliseconds
  endDate?: string; // ISO string
  endDateMs?: number; // epoch milliseconds
  // Legacy fallback fields for backward-compat
  startTime?: string;
  endTime?: string;
  usageCount: number;
  status: "Aktif" | "Expired" | "ACTIVE" | "EXPIRED";
  maxUsage?: number;
  maxUsagePerUser?: number;
  usedCount?: number;
};
