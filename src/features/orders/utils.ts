// Helper untuk mapping status UI ke enum backend uppercase
export function mapUiToBackend(s: string) {
  switch (s.trim().toLowerCase()) {
    case "pending":
      return "PENDING";
    case "proses":
    case "diproses":
    case "processing":
      return "PROCESSING";
    case "ambil":
    case "ready":
    case "ready_for_pickup":
    case "siap diambil":
    case "siap_ambil":
      return "READY_FOR_PICKUP";
    case "selesai":
    case "completed":
      return "COMPLETED";
    case "batalkan":
    case "cancelled":
    case "canceled":
      return "CANCELLED";
    default:
      throw new Error("Status tidak valid");
  }
}

// Helper untuk menggabungkan tanggal (yyyy-MM-dd) dan jam (HH:mm) menjadi ISO UTC
export function composePickupAt(dateStr: string, timeStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0));
  return dt.toISOString();
}
