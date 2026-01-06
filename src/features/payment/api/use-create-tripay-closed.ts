import { useMutation } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";

export type TripayCustomer = {
  name: string;
  email: string;
  phone: string;
};

export type TripayItem = {
  name: string;
  price: number;
  quantity: number;
};

export type CreateTripayClosedPayload = {
  method: string; // BNIVA, BRIVA, MANDIRVA, BCAVA, QRIS
  amount: number;
  orderId: string; // merchant_ref
  customer: TripayCustomer;
  items: TripayItem[];
  returnUrl?: string; // optional, for redirect type
};

export const useCreateTripayClosed = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: any) => void;
  onError?: (e: unknown) => void;
} = {}) => {
  return useMutation({
    mutationFn: async (payload: CreateTripayClosedPayload) => {
      const { data } = await axiosInstance.post("/payments/tripay/closed", payload);
      return data;
    },
    onSuccess,
    onError,
  });
};