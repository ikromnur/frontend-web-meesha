import { axiosInstance } from "@/lib/axios";
import { useMutation } from "@tanstack/react-query";

// Payload untuk pembuatan order sesuai backend (CreateOrderDto)
export interface CreateOrderPayload {
  shippingAddress: string;
  paymentMethod: string; // contoh: "TRIPAY"
  orderItems: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  // Opsional: jadwal pengambilan agar admin dan user melihat "Waktu Ambil"
  pickup_date?: string; // ISO string, contoh: 2025-12-05T14:00:00.000Z
  pickup_time?: string; // HH:mm, contoh: "14:00"
}

interface UseCreateOrderProps {
  onSuccess?: (data: OrderResponseData) => void;
  onError?: (e: Error) => void;
}

// Bentuk data respons order yang umum dari backend
export interface OrderResponseData {
  id?: string | number;
  orderId?: string | number;
  totalAmount?: number;
  [key: string]: unknown;
}

// Tetap memakai nama hook lama untuk menghindari refactor luas
export const UseCreateTransaction = ({
  onSuccess,
  onError,
}: UseCreateOrderProps) => {
  return useMutation<OrderResponseData, Error, CreateOrderPayload>({
    mutationFn: async (payload: CreateOrderPayload) => {
      // baseURL axiosInstance adalah '/api' saat menggunakan local API routes
      // Endpoint yang benar untuk membuat order adalah '/orders'
      const { data } = await axiosInstance.post(`/orders`, payload);
      // Normalisasi agar selalu mengembalikan objek data langsung
      const normalized: OrderResponseData = (data && (data.data ?? data)) as OrderResponseData;
      return normalized;
    },
    onSuccess,
    onError,
  });
};
