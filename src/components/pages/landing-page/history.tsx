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

const tabs: {
  label: string;
  value: "all" | OrderStatus;
  filter: (o: Order) => boolean;
}[] = [
  {
    label: "Pending",
    value: "pending",
    filter: (o: Order) => ["pending", "unpaid"].includes(o.status?.toLowerCase()),
  },
  {
    label: "Proses",
    value: "processing",
    filter: (o: Order) => ["processing", "paid", "success"].includes(o.status?.toLowerCase()),
  },
  {
    label: "Selesai",
    value: "completed",
    filter: (o: Order) => o.status === "completed",
  },
  {
    label: "Dibatalkan",
    value: "cancelled",
    filter: (o: Order) => o.status === "cancelled",
  },
];

const HistoryPage = () => {
  const { data: session } = useSession();
  const { params, updateParams } = useUpdateSearchParams();
  const router = useRouter();

  const currentTab = tabs.some((t) => t.value === params.filter)
    ? (params.filter as string)
    : "pending";

  // Gunakan endpoint proxy /api/orders untuk pengguna biasa (non-admin)
  const { data: orders = [], isLoading } = useGetMyOrders();

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
      ) : !orders || orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-5xl mb-4">📦</div>
          <h3 className="text-xl font-semibold mb-2">Belum Ada Pesanan</h3>
          <p className="text-muted-foreground mb-4">
            Anda belum memiliki riwayat pesanan
          </p>
          <Button onClick={() => router.push("/products")}>
            Mulai Belanja
          </Button>
        </div>
      ) : (
        <Tabs value={currentTab} onValueChange={handleTabChange}>
          <TabsList className="mb-5">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => {
            const filteredOrders = orders.filter(tab.filter);
            return (
              <TabsContent
                key={tab.value}
                value={tab.value}
                className="flex flex-col gap-5"
              >
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>
                      Tidak ada pesanan dengan status {tab.label.toLowerCase()}
                    </p>
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
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
