"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrderCard from "@/features/orders/components/OrderCard";
import { useUpdateSearchParams } from "@/hooks/use-search-params";
import { Order, OrderStatus } from "@/features/orders/types/order.types";
import UnauthorizePage from "../unauthorize";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useGetMyOrders } from "@/features/orders/api/use-get-my-orders";
import { useUpdateOrderStatus } from "@/features/orders/api/use-update-order-status";
import { useToast } from "@/hooks/use-toast";

const tabs: {
  label: string;
  value: "all" | OrderStatus;
  filter: (o: Order) => boolean;
}[] = [
  {
    label: "Pending",
    value: "pending",
    filter: (o: Order) => {
      const s = o.status?.toLowerCase();
      // Catch-all: pending, unpaid, or any unknown/missing status that isn't processed/completed/cancelled
      const isKnownOther = [
        "processing",
        "paid",
        "success",
        "ambil",
        "ready_for_pickup",
        "completed",
        "cancelled",
        "failed",
        "expired",
      ].includes(s || "");
      return !isKnownOther;
    },
  },
  {
    label: "Proses",
    value: "processing",
    filter: (o: Order) =>
      ["processing", "paid", "success", "ambil", "ready_for_pickup"].includes(
        o.status?.toLowerCase()
      ),
  },
  {
    label: "Selesai",
    value: "completed",
    filter: (o: Order) => o.status === "completed",
  },
  {
    label: "Dibatalkan",
    value: "cancelled",
    filter: (o: Order) =>
      ["cancelled", "failed", "expired"].includes(o.status?.toLowerCase()),
  },
];

const HistoryPage = () => {
  const { data: session } = useSession();
  const { params, updateParams } = useUpdateSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const currentTab = tabs.some((t) => t.value === params.filter)
    ? (params.filter as string)
    : "pending";

  // Gunakan endpoint proxy /api/orders untuk pengguna biasa (non-admin)
  const { data: orders = [], isLoading } = useGetMyOrders();

  const { mutate: updateStatus } = useUpdateOrderStatus({
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Pesanan berhasil dibatalkan",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error?.message || "Gagal membatalkan pesanan",
        variant: "destructive",
      });
    },
  });

  const handleCancel = (orderId: string) => {
    if (confirm("Apakah Anda yakin ingin membatalkan pesanan ini?")) {
      updateStatus({ order_id: orderId, status: "cancelled" });
    }
  };

  // Debugging: Log orders to console to help troubleshoot missing items
  if (orders.length > 0) {
    console.log("My Orders:", orders);
  }

  const handleTabChange = (value: string) => {
    updateParams({ filter: value });
  };

  if (!session) {
    return <UnauthorizePage />;
  }

  return (
    <div className="relative w-full max-w-screen-xl mx-auto px-4 pt-6">
      <h1 className="font-medium text-2xl mb-8">Order History</h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Memuat riwayat pesanan...</p>
          </div>
        </div>
      ) : (
        <Tabs value={currentTab} onValueChange={handleTabChange}>
          <TabsList className="mb-5 w-full justify-start overflow-x-auto">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => {
            const filteredOrders = orders.filter(tab.filter);
            // Jika tab aktif dan datanya kosong, tampilkan Empty State
            const isTabEmpty = filteredOrders.length === 0;

            return (
              <TabsContent
                key={tab.value}
                value={tab.value}
                className="flex flex-col gap-5 min-h-[300px]"
              >
                {isTabEmpty ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
                    <div className="text-4xl mb-3">📦</div>
                    <h3 className="text-lg font-medium mb-1">
                      Tidak ada pesanan dengan status {tab.label.toLowerCase()}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {tab.value === "pending"
                        ? "Anda tidak memiliki pesanan yang menunggu pembayaran"
                        : `Belum ada riwayat pesanan di status ${tab.label}`}
                    </p>
                    {orders.length === 0 && tab.value === "pending" && (
                      <Button
                        onClick={() => router.push("/products")}
                        variant="outline"
                      >
                        Mulai Belanja
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onCancel={handleCancel}
                    />
                  ))
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
};

export default HistoryPage;
