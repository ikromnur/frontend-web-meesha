export type OrderStatus =
  | "pending"
  | "unpaid" // Status baru untuk order yang belum dibayar
  | "processing"
  | "paid"
  | "success"
  | "ambil" // READY_FOR_PICKUP (frontend alias)
  | "ready_for_pickup"
  | "completed"
  | "cancelled"
  | "failed"
  | "expired";

export interface ProductRating {
  id: number;
  product_id: number;
  order_id: string;
  user_id: number;
  rating: number; // 1-5
  comment?: string;
  reply?: string;
  created_at: string;
  user?: {
    name: string;
    image?: string;
  };
}

export interface OrderProduct {
  id: number;
  product_id: number;
  name: string;
  image: string;
  quantity: number;
  size: string;
  price: number;
  rating?: ProductRating;
}

export interface Order {
  db_id: string; // UUID asli order untuk operasi update
  id: number;
  order_id: string;
  user_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  products: OrderProduct[];
  ratings?: ProductRating[];
  total_amount: number;
  status: OrderStatus;
  pickup_date: string;
  pickup_time: string;
  // Alias snake_case yang disediakan backend untuk konsistensi
  pickup_at?: string; // ISO datetime
  // Alasan perubahan jadwal ambil (opsional)
  pickup_reason?: string;
  pickupChangeReason?: string;
  picked_up_at?: string; // ISO datetime saat pesanan diambil
  picked_up_by?: string; // siapa yang menandai pengambilan
  notes?: string;
  paymentMethod?: string;
  paymentMethodCode?: string; // e.g. BRIVA, BNI, etc.
  paymentExpiresAt?: string; // ISO Date String
  tripayReference?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderFilters {
  date?: string;
  status?: OrderStatus | "all";
  search?: string;
  pickupOnly?: boolean; // jika true, backend memfilter berdasarkan tanggal pickup saat status=processing
}

export interface OrderStatusUpdate {
  // Gunakan UUID (db_id) untuk path update
  order_id: string;
  status: OrderStatus;
  notes?: string;
  pickupAt?: string;
  // Opsional: dukungan alias snake_case jika diperlukan di masa depan
  pickup_at?: string;
}

export interface OrderStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  cancelled: number;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  unpaid: "Belum Dibayar",
  processing: "Proses",
  ambil: "Ambil",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  unpaid: "bg-yellow-100 text-yellow-800 border-yellow-200", // Sama dengan pending
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  ambil: "bg-indigo-100 text-indigo-800 border-indigo-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

// Jadwal pickup terstruktur (durasi slot 1 jam)
export interface PickupSlot {
  date: string; // YYYY-MM-DD (local date in Asia/Jakarta)
  start: string; // HH:mm (start time)
  end: string; // HH:mm (end time, start + 1 hour)
}
