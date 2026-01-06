"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useDashboardStats } from "@/features/dashboard/api/use-dashboard-stats";
import { useGetOrders } from "@/features/orders/api/use-get-orders";
import {
  type OrderStatus,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "@/features/orders/types/order.types";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah } from "@/helper/format-rupiah";
import { PackageOpen, Wallet, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUpdateOrderStatus } from "@/features/orders/api/use-update-order-status";

const statusLabels: Record<OrderStatus | "all", string> = {
  all: "Semua",
  pending: "Pending",
  unpaid: "Belum Dibayar",
  processing: "Proses",
  ambil: "Siap Ambil",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export default function DashboardHomePage() {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "all">(
    "pending"
  );

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  // Statistik dashboard (produk terjual, profit, pelanggan baru)
  const { data: stats, isLoading: loadingStats } = useDashboardStats();

  // Pesanan hari ini menggunakan hook orders yang sudah ada
  const { data: orders = [], isLoading: loadingOrders } = useGetOrders({
    filters: {
      date: today,
      status: selectedStatus,
    },
  });

  const quickStats = {
    productsSold: stats?.productsSold ?? stats?.totalSold ?? 0,
    totalProfit: stats?.totalProfit ?? stats?.profit ?? 0,
    newCustomers: stats?.newCustomers ?? stats?.customersNew ?? 0,
  };

  const latestOrders = orders.slice(0, 5);

  // Catatan: halaman ini tidak lagi memproses status "Sudah Diambil".

  // Mutasi status pesanan: gunakan untuk menandai pesanan sebagai selesai (COMPLETED)
  const { mutateAsync: updateOrderStatusAsync, isPending: isUpdatingStatus } =
    useUpdateOrderStatus({
      onSuccess: () =>
        toast({
          title: "Berhasil",
          description: "Status pesanan berhasil diperbarui",
        }),
      onError: (err: any) => {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Gagal memperbarui status";
        toast({ title: "Gagal", description: message, variant: "destructive" });
      },
    });

  const handleMarkCompleted = async (orderId: string) => {
    try {
      await updateOrderStatusAsync({ order_id: orderId, status: "completed" });
    } catch (e) {
      // error sudah ditangani di onError
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard Admin</h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan cepat dan pesanan yang masuk hari ini
          </p>
        </div>
      </div>

      {/* Statistik Ringkas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Produk Terjual
            </CardTitle>
            <PackageOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {quickStats.productsSold}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Hari ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-6 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {formatRupiah(quickStats.totalProfit)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Hari ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pelanggan Baru
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {quickStats.newCustomers}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Hari ini</p>
          </CardContent>
        </Card>
      </div>

      {/* Pesanan Hari Ini */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pesanan Hari Ini</CardTitle>
            <p className="text-sm text-muted-foreground">
              Menampilkan 5 pesanan terbaru untuk tanggal{" "}
              {format(new Date(), "dd MMM yyyy")}
            </p>
          </div>

          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/orders">Lihat Semua Pesanan</Link>
          </Button>
        </CardHeader>

        <CardContent>
          {/* Status Tabs */}
          <Tabs
            value={selectedStatus}
            onValueChange={(v) => setSelectedStatus(v as any)}
          >
            <TabsList className="grid grid-cols-4 w-full mb-4">
              {(
                ["pending", "processing", "completed", "cancelled"] as const
              ).map((s) => (
                <TabsTrigger key={s} value={s}>
                  {statusLabels[s]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {loadingOrders ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : latestOrders.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Belum ada pesanan untuk filter ini.
            </div>
          ) : (
            <div className="space-y-3">
              {latestOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border rounded-md p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {order.order_id}
                      </span>
                      <Badge
                        variant="outline"
                        className={`${
                          ORDER_STATUS_COLORS[order.status]
                        } text-xs`}
                      >
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium truncate">
                      {order.customer_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatRupiah(order.total_amount)} •{" "}
                      {format(new Date(order.created_at), "HH:mm")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {order.status === "processing" && (
                      <Button
                        size="sm"
                        onClick={() => handleMarkCompleted(order.order_id)}
                        disabled={isUpdatingStatus}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isUpdatingStatus ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            Memproses
                          </>
                        ) : (
                          "Selesai"
                        )}
                      </Button>
                    )}
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/dashboard/orders`}>Detail</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// HAPUS blok berikut dari file ini:
// export const metadata = {
//   title: "Dashboard Admin | Meesha Florist Kebumen",
// };
