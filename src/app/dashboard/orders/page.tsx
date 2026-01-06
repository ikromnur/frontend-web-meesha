"use client";

import React, { useState } from "react";
import { useGetOrders } from "@/features/orders/api/use-get-orders";
import { useGetOrderStats } from "@/features/orders/api/use-get-order-stats";
import { useUpdateOrderStatus } from "@/features/orders/api/use-update-order-status";
import { OrderCard } from "@/features/orders/components/OrderCard";
import { OrderFilters } from "@/features/orders/components/OrderFilters";
import { OrderHistory } from "@/features/orders/components/OrderHistory";
import { EmptyState } from "@/features/orders/components/EmptyState";
import { Order, OrderStatus } from "@/features/orders/types/order.types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

import { isAxiosError } from "axios";

const OrdersPage = () => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "all">(
    "pending"
  );
  const [pickupOnly, setPickupOnly] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    orderId: string | null; // gunakan UUID (db_id)
    action: "process" | "complete" | "cancel" | "archive" | null;
  }>({
    isOpen: false,
    orderId: null,
    action: null,
  });

  // Fetch orders with filters
  const toJakartaISODate = (d?: Date) =>
    d
      ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d)
      : undefined;

  const {
    data: orders = [],
    isLoading: isLoadingOrders,
    refetch: refetchOrders,
  } = useGetOrders({
    filters: {
      date: toJakartaISODate(selectedDate),
      status: selectedStatus,
      pickupOnly,
    },
  });

  // Fetch order statistics
  const { data: stats } = useGetOrderStats({
    date: toJakartaISODate(selectedDate),
    pickupOnly,
  });

  // Fallback: hitung statistik dari daftar orders jika API stats gagal
  const computedStats = React.useMemo(() => {
    const base = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      cancelled: 0,
    };
    if (!orders || orders.length === 0) return base;
    for (const o of orders) {
      base.total += 1;
      if (o.status === "pending") base.pending += 1;
      else if (o.status === "processing") base.processing += 1;
      else if (o.status === "completed") base.completed += 1;
      else if (o.status === "cancelled") base.cancelled += 1;
    }
    return base;
  }, [orders]);

  // Update order status mutation
  const { mutateAsync: updateOrderStatusAsync, isPending: isUpdatingStatus } =
    useUpdateOrderStatus({
      onSuccess: () => {
        toast({
          title: "Berhasil",
          description: getSuccessMessage(confirmDialog.action),
        });
        setConfirmDialog({ isOpen: false, orderId: null, action: null });
        setDialogError(null);
        refetchOrders();
      },
      onError: (error) => {
        if (isAxiosError(error)) {
          const errorMessage =
            error.response?.data?.error?.message ||
            error.response?.data?.message ||
            "Gagal memperbarui status pesanan";
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
          setDialogError(errorMessage);
        } else {
          toast({
            title: "Error",
            description: "Gagal memperbarui status pesanan",
            variant: "destructive",
          });
          setDialogError("Gagal memperbarui status pesanan");
        }
        // Biarkan dialog tetap terbuka agar user melihat pesan error.
      },
    });

  const getSuccessMessage = (action: string | null) => {
    switch (action) {
      case "process":
        return "Status pesanan diubah ke Proses";
      case "complete":
        return "Pesanan selesai! Notifikasi telah dikirim ke pelanggan.";
      case "cancel":
        return "Pesanan telah dibatalkan";
      case "archive":
        return "Pesanan telah diarsipkan";
      default:
        return "Status pesanan berhasil diperbarui";
    }
  };

  const [dialogError, setDialogError] = useState<string | null>(null);

  const handleOpenDialog = (
    orderId: string,
    action: "process" | "complete" | "cancel" | "archive"
  ) => {
    setDialogError(null);
    setConfirmDialog({
      isOpen: true,
      orderId,
      action,
    });
  };

  const handleConfirmAction = () => {
    if (!confirmDialog.orderId || !confirmDialog.action) return;
    const orderId = confirmDialog.orderId as string;
    const action = confirmDialog.action;
    console.log("[Orders] Confirm action", {
      orderId,
      action,
    });

    const statusMap: Record<string, OrderStatus> = {
      process: "processing",
      complete: "completed",
      cancel: "cancelled",
      archive: "completed", // Archive keeps the status but could add archived flag in backend
    };

    const targetStatus = statusMap[action];
    const order = orders.find((o) => o.order_id === orderId);

    // Two-step rule: Pending -> Completed tidak langsung (kecuali backend mengizinkan)
    const shouldTwoStep =
      order?.status === "pending" && targetStatus === "completed";

    const run = async () => {
      if (shouldTwoStep) {
        // Step 1: PROCESSING
        await updateOrderStatusAsync({
          order_id: orderId,
          status: "processing",
        });
        // Step 2: COMPLETED
        await updateOrderStatusAsync({
          order_id: orderId,
          status: "completed",
        });
      } else {
        await updateOrderStatusAsync({
          order_id: orderId,
          status: targetStatus,
        });
      }
      console.log("[Orders] Sent status update", {
        orderId,
        status: targetStatus,
        twoStep: shouldTwoStep,
      });
    };

    run();
  };

  const getDialogContent = () => {
    switch (confirmDialog.action) {
      case "process":
        return {
          title: "Proses Pesanan",
          description:
            "Apakah Anda yakin ingin memproses pesanan ini? Status akan berubah menjadi 'Proses'.",
          actionText: "Proses",
          actionVariant: "default" as const,
        };
      case "complete":
        return {
          title: "Selesaikan Pesanan",
          description:
            "Apakah Anda yakin pesanan sudah selesai? Pelanggan akan menerima notifikasi bahwa pesanan siap diambil.",
          actionText: "Selesai",
          actionVariant: "default" as const,
        };
      case "cancel":
        return {
          title: "Batalkan Pesanan",
          description:
            "Apakah Anda yakin ingin membatalkan pesanan ini? Tindakan ini tidak dapat dibatalkan.",
          actionText: "Batalkan",
          actionVariant: "destructive" as const,
        };
      case "archive":
        return {
          title: "Arsipkan Pesanan",
          description:
            "Apakah Anda yakin ingin mengarsipkan pesanan ini? Pesanan akan dipindahkan ke history.",
          actionText: "Arsipkan",
          actionVariant: "default" as const,
        };
      default:
        return {
          title: "Konfirmasi",
          description: "Apakah Anda yakin?",
          actionText: "OK",
          actionVariant: "default" as const,
        };
    }
  };

  const dialogContent = getDialogContent();

  const handleResetFilters = () => {
    setSelectedDate(new Date());
    setSelectedStatus("all");
  };

  const filteredOrders = orders.filter((order) => {
    if (selectedStatus === "all") return true;
    if (selectedStatus === "processing" && pickupOnly) {
      const hasPickup = Boolean(
        order.pickup_date ||
          order.pickup_time ||
          (order as any)?.pickup_at ||
          (order as any)?.pickupAt
      );
      if (!hasPickup) return false;
      if (!selectedDate) return true;
      const iso = toJakartaISODate(selectedDate);
      const pickupIso = (() => {
        if (order.pickup_date) return String(order.pickup_date).slice(0, 10);
        const any = (order as any)?.pickup_at || (order as any)?.pickupAt;
        if (any) {
          const d = new Date(any);
          if (!isNaN(d.getTime())) {
            return new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Jakarta",
            }).format(d);
          }
        }
        return "";
      })();
      return pickupIso === iso;
    }
    return order.status === selectedStatus;
  });

  const getEmptyStateVariant = () => {
    if (selectedDate && filteredOrders.length === 0 && orders.length === 0) {
      return "no-orders-today";
    }
    if (filteredOrders.length === 0 && orders.length > 0) {
      return "no-results";
    }
    return "no-orders";
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Pesanan</h1>
          <p className="text-gray-600 mt-1">
            Kelola semua pesanan yang masuk secara real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setSelectedDate(new Date());
              setSelectedStatus("processing");
              setPickupOnly(true);
              refetchOrders();
            }}
            variant="secondary"
            size="sm"
          >
            Siap Ambil Hari Ini
          </Button>
          <Button
            onClick={() => refetchOrders()}
            variant="outline"
            size="sm"
            disabled={isLoadingOrders}
          >
            <RefreshCcw
              className={`w-4 h-4 mr-2 ${
                isLoadingOrders ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <OrderFilters
        selectedDate={selectedDate}
        selectedStatus={selectedStatus}
        onDateChange={setSelectedDate}
        onStatusChange={(value) => {
          setSelectedStatus(value);
          setPickupOnly(false);
        }}
        stats={{
          all: (stats?.total ?? computedStats.total) || 0,
          pending: (stats?.pending ?? computedStats.pending) || 0,
          processing: (stats?.processing ?? computedStats.processing) || 0,
          completed: (stats?.completed ?? computedStats.completed) || 0,
          cancelled: (stats?.cancelled ?? computedStats.cancelled) || 0,
        }}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Orders List */}
        <div className="lg:col-span-2">
          {isLoadingOrders ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              variant={getEmptyStateVariant()}
              onReset={handleResetFilters}
            />
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onProcess={(id) => handleOpenDialog(id, "process")}
                  onComplete={(id) => handleOpenDialog(id, "complete")}
                  onCancel={(id) => handleOpenDialog(id, "cancel")}
                  onArchive={(id) => handleOpenDialog(id, "archive")}
                  isLoading={isUpdatingStatus}
                />
              ))}
            </div>
          )}
        </div>

        {/* History Panel */}
        <div className="lg:col-span-1">
          <OrderHistory
            orders={orders}
            onSelectOrder={setSelectedOrder}
            selectedOrderId={selectedOrder?.id}
          />
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ isOpen: false, orderId: null, action: null });
            setDialogError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogContent.description}
            </AlertDialogDescription>
            {dialogError ? (
              <div className="mt-2 text-sm text-destructive">{dialogError}</div>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingStatus}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={isUpdatingStatus}
              className={
                dialogContent.actionVariant === "destructive"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {isUpdatingStatus ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                dialogContent.actionText
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrdersPage;
