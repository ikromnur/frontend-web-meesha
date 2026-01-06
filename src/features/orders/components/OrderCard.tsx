"use client";

import React, { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import {
  Order,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from "../types/order.types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Mail,
  Phone,
  Package,
  Calendar,
  CheckCircle,
  XCircle,
  PlayCircle,
} from "lucide-react";
import { formatRupiah } from "@/helper/format-rupiah";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUpdateOrderPickup } from "../api/use-update-order-pickup";
import { FaStar } from "react-icons/fa";
import { Textarea } from "@/components/ui/textarea";
import { RatingDialog } from "./RatingDialog";
import { ProductRating } from "../types/order.types";

interface OrderCardProps {
  order: Order;
  // Gunakan UUID (db_id) untuk operasi update
  onProcess?: (orderId: string) => void;
  onComplete?: (orderId: string) => void;
  onCancel?: (orderId: string) => void;
  onArchive?: (orderId: string) => void;
  isLoading?: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onProcess,
  onComplete,
  onCancel,
  onArchive,
  isLoading = false,
}) => {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const role = String(session?.user?.role || "").toLowerCase();
  const isAdmin = role === "admin" || role === "superadmin";

  // Admin-only: edit pickup schedule
  const [editingPickup, setEditingPickup] = useState(false);
  const [pickupDate, setPickupDate] = useState<string>(""); // yyyy-MM-dd
  const [pickupTime, setPickupTime] = useState<string>(""); // HH:mm
  const [pickupReason, setPickupReason] = useState<string>(""); // alasan perubahan jadwal ambil
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (
      (order.status === "pending" || order.status === "unpaid") &&
      order.paymentExpiresAt
    ) {
      const calculateTime = () => {
        const now = new Date();
        const expiry = new Date(order.paymentExpiresAt!);
        const diff = expiry.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeLeft("Waktu Habis");
          // Jika waktu habis, reload halaman untuk sinkronisasi status (misal ke Dibatalkan)
          window.location.reload();
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(
          `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        );
      };

      calculateTime(); // Initial call
      const interval = setInterval(calculateTime, 1000);
      return () => clearInterval(interval);
    }
  }, [order.status, order.paymentExpiresAt]);

  // derive initial pickup date/time from order
  const initialPickup = useMemo(() => {
    const toDate = (val: any) => {
      if (!val) return null;
      if (typeof val === "number") {
        return new Date(val < 1e12 ? val * 1000 : val);
      }
      if (typeof val === "string") {
        const s = val.trim();
        const d = new Date(s);
        if (!isNaN(d.getTime())) return d;
        const d2 = new Date(s.replace(" ", "T"));
        if (!isNaN(d2.getTime())) return d2;
      }
      return null;
    };
    let d = toDate(order.pickup_date);
    if (!d) {
      const pickupAny = order.pickup_at ?? (order as any)?.pickupAt;
      d = toDate(pickupAny);
    }
    return d;
  }, [order]);

  const initialTime = useMemo(() => {
    const t = (order as any)?.pickup_time || "";
    const m = String(t).match(/^\d{2}:\d{2}$/) ? t : "";
    if (m) return m;
    // Fallback: derive from pickupAt/initialPickup to HH:mm
    try {
      const d = (initialPickup as Date | null) || null;
      if (d && !isNaN(d.getTime())) {
        const hh = String(d.getUTCHours()).padStart(2, "0");
        const mm = String(d.getUTCMinutes()).padStart(2, "0");
        return `${hh}:${mm}`;
      }
    } catch {}
    return "";
  }, [order]);

  // init fields when toggling edit on
  const toggleEditPickup = () => {
    const nowDate = initialPickup ? initialPickup : null;
    setPickupDate(
      nowDate
        ? `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(
            2,
            "0"
          )}-${String(nowDate.getDate()).padStart(2, "0")}`
        : ""
    );
    setPickupTime(initialTime || "");
    // Prefill alasan bila sudah ada
    const existingReason = String(
      (order as any)?.pickup_reason ||
        (order as any)?.pickupReason ||
        (order as any)?.pickupChangeReason ||
        ""
    ).trim();
    setPickupReason(existingReason);
    setEditingPickup((v) => !v);
  };

  const { mutate: updatePickup, isPending: isUpdatingPickup } =
    useUpdateOrderPickup({
      onSuccess: () => {
        toast({ title: "Berhasil", description: "Jadwal ambil diperbarui." });
        setEditingPickup(false);
      },
      onError: (e: unknown) => {
        const msg =
          (e as any)?.response?.data?.error?.message ||
          (e as any)?.response?.data?.message ||
          (e as Error)?.message ||
          "Gagal memperbarui jadwal ambil";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    });

  const handleSavePickup = () => {
    if (!pickupDate || !pickupTime) {
      toast({
        title: "Lengkapi jadwal",
        description: "Tanggal dan jam wajib diisi.",
        variant: "destructive",
      });
      return;
    }
    const reason = pickupReason.trim();
    if (!reason || reason.length < 5) {
      toast({
        title: "Alasan wajib diisi",
        description:
          "Mohon isi alasan perubahan jadwal ambil (min. 5 karakter).",
        variant: "destructive",
      });
      return;
    }
    const [hStr, mStr] = String(pickupTime).split(":");
    const h = Number(hStr);
    const m = Number(mStr);
    if (Number.isNaN(h) || Number.isNaN(m)) {
      toast({
        title: "Jam tidak valid",
        description: "Format jam harus HH:mm.",
        variant: "destructive",
      });
      return;
    }
    try {
      const d = new Date(`${pickupDate}T00:00:00.000Z`);
      if (!isNaN(d.getTime())) {
        d.setHours(h, m, 0, 0);
      }
      const iso = d.toISOString();
      updatePickup({
        order_id: order.order_id,
        pickupAt: iso,
        pickupReason: reason,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "Gagal menyusun tanggal.",
        variant: "destructive",
      });
    }
  };
  const renderActionButtons = () => {
    switch (order.status) {
      case "pending":
      case "unpaid":
        if (!isAdmin) {
          const method =
            (order as any)?.paymentMethod ||
            (order as any)?.payment_method ||
            (order as any)?.method ||
            "";
          const methodCode =
            (order as any)?.paymentMethodCode ||
            (order as any)?.payment_method_code ||
            "";

          const methodDisplay = methodCode
            ? `${method} (${methodCode})`
            : method;

          const shippingAddress =
            (order as any)?.shippingAddress ||
            (order as any)?.shipping_address ||
            "";
          const pickupAny =
            (order as any)?.pickupAt || (order as any)?.pickup_at || null;
          const pickupReasonAny = String(
            (order as any)?.pickup_reason ||
              (order as any)?.pickupReason ||
              (order as any)?.pickupChangeReason ||
              ""
          ).trim();
          const pickupDisplay = (() => {
            if (!pickupAny) return "";
            const d = new Date(pickupAny);
            if (isNaN(d.getTime())) return "";
            return format(d, "dd MMM yyyy, HH:mm", { locale: id });
          })();

          return (
            <div className="flex flex-col gap-3 mt-3">
              {timeLeft && timeLeft !== "Waktu Habis" && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-md text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <p className="text-xs text-orange-600 font-medium">
                      Sisa Waktu Pembayaran
                    </p>
                  </div>
                  <p className="text-xl font-bold text-orange-700 font-mono tracking-wider">
                    {timeLeft}
                  </p>
                </div>
              )}

              <Button
                onClick={() => router.push(`/payment?order=${order.order_id}`)}
                className="w-full"
                variant="default"
              >
                Bayar
              </Button>

              <div className="space-y-2">
                {pickupDisplay ? (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-1" /> Pickup Dijadwalkan:
                    </div>
                    <span className="font-medium">{pickupDisplay}</span>
                  </div>
                ) : null}
                {pickupReasonAny ? (
                  <div className="flex items-start justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      Alasan perubahan:
                    </div>
                    <span className="font-medium text-right max-w-[60%] break-words">
                      {pickupReasonAny}
                    </span>
                  </div>
                ) : null}
                {shippingAddress ? (
                  <div className="flex items-start justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      Alamat / Catatan:
                    </div>
                    <span className="font-medium text-right max-w-[60%] break-words">
                      {String(shippingAddress)}
                    </span>
                  </div>
                ) : null}
                {method ? (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      Metode Pembayaran:
                    </div>
                    <span className="font-medium">{String(methodDisplay)}</span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        }
        return (
          <div className="flex gap-2">
            <Button
              onClick={() => {
                console.log("[OrderCard] Click Proses", {
                  order_id: order.order_id,
                });
                onProcess?.(order.order_id);
              }}
              disabled={isLoading}
              className="flex-1"
              size="sm"
            >
              <PlayCircle className="w-4 h-4 mr-1" />
              Proses
            </Button>
            <Button
              onClick={() => {
                console.log("[OrderCard] Click Batal", {
                  order_id: order.order_id,
                });
                onCancel?.(order.order_id);
              }}
              disabled={isLoading}
              variant="destructive"
              className="flex-1"
              size="sm"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Batal
            </Button>
          </div>
        );

      case "processing":
        if (!isAdmin) {
          const hasPickup = Boolean(
            (order as any)?.pickup_date ||
              (order as any)?.pickup_time ||
              (order as any)?.pickupAt ||
              (order as any)?.pickup_at
          );
          if (!hasPickup) {
            return (
              <Button
                onClick={() =>
                  router.push(
                    `/orders/${encodeURIComponent(order.order_id)}/pickup`
                  )
                }
                disabled={isLoading}
                className="w-full"
                size="sm"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Pilih Waktu Pengambilan
              </Button>
            );
          }
          return null;
        }
        return (
          <Button
            onClick={() => {
              console.log("[OrderCard] Click Selesai", {
                order_id: order.order_id,
              });
              onComplete?.(order.order_id);
            }}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Selesai
          </Button>
        );

      case "ambil":
        if (!isAdmin) {
          return null;
        }
        return (
          <Button
            onClick={() => {
              console.log("[OrderCard] Click Selesai (Ambil)", {
                order_id: order.order_id,
              });
              onComplete?.(order.order_id);
            }}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Selesai
          </Button>
        );

      case "completed":
        return (
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                console.log("[OrderCard] Click Arsipkan", {
                  order_id: order.order_id,
                });
                onArchive?.(order.order_id);
              }}
              disabled={isLoading}
              variant="outline"
              className="w-full"
              size="sm"
            >
              Arsipkan
            </Button>
          </div>
        );

      case "cancelled":
        return null;

      default:
        return null;
    }
  };

  const noticeForUser =
    !isAdmin && (order.status === "processing" || order.status === "ambil") ? (
      <div className="w-full text-xs text-muted-foreground">
        Hanya admin yang dapat menyelesaikan pesanan.
      </div>
    ) : null;

  // Admin: aksi invoice
  const [resending, setResending] = useState(false);
  const previewHref = `/api/orders/${encodeURIComponent(
    order.order_id
  )}/invoice/preview`;
  const downloadHref = `/api/orders/${encodeURIComponent(
    order.order_id
  )}/invoice`;

  const canResendInvoice = isAdmin && ["completed"].includes(order.status);
  const handleResendInvoice = async () => {
    try {
      setResending(true);
      const res = await fetch(
        `/api/orders/${encodeURIComponent(order.order_id)}/invoice/resend`,
        {
          method: "POST",
        }
      );
      if (res.ok) {
        toast({ title: "Berhasil", description: "Invoice PDF dikirim ulang." });
      } else {
        const json = await res.json().catch(() => ({}));
        const msg = json?.message || `Gagal kirim ulang (status ${res.status})`;
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Gagal mengirim ulang invoice",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">{order.customer_name}</h3>
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="w-3.5 h-3.5 mr-1" />
              {order.customer_email}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="w-3.5 h-3.5 mr-1" />
              {order.customer_phone}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge
              variant="outline"
              className={`${ORDER_STATUS_COLORS[order.status]} font-medium`}
            >
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
            {order.status === "ambil" ||
            (order.status === "processing" &&
              (order.pickup_date ||
                order.pickup_time ||
                (order as any)?.pickupAt)) ? (
              <Badge variant="secondary" className="text-xs">
                {(() => {
                  // Tampilkan jam jika tersedia
                  const toDate = (val: any) => {
                    if (!val) return null;
                    if (typeof val === "number") {
                      return new Date(val < 1e12 ? val * 1000 : val);
                    }
                    if (typeof val === "string") {
                      const s = val.trim();
                      const d = new Date(s);
                      if (!isNaN(d.getTime())) return d;
                      const d2 = new Date(s.replace(" ", "T"));
                      if (!isNaN(d2.getTime())) return d2;
                    }
                    return null;
                  };
                  const timeStr = (() => {
                    const t = String(order.pickup_time || "").trim();
                    if (t) return t;
                    const any = order.pickup_at ?? (order as any)?.pickupAt;
                    const d = toDate(any);
                    return d ? format(d, "HH:mm") : "";
                  })();
                  return timeStr ? `Siap Ambil • ${timeStr}` : "Siap Ambil";
                })()}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4 space-y-3">
        {/* Order Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600">
            <Package className="w-4 h-4 mr-1" />
            ID Pesanan:
          </div>
          <span className="font-mono font-medium">{order.order_id}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600">
            <Clock className="w-4 h-4 mr-1" />
            Waktu Masuk:
          </div>
          <span className="font-medium">
            {(() => {
              const toDate = (val: any) => {
                if (!val) return null;
                if (typeof val === "number") {
                  return new Date(val < 1e12 ? val * 1000 : val);
                }
                if (typeof val === "string") {
                  const s = val.trim();
                  const d = new Date(s);
                  if (!isNaN(d.getTime())) return d;
                  const d2 = new Date(s.replace(" ", "T"));
                  if (!isNaN(d2.getTime())) return d2;
                }
                return null;
              };
              const d = toDate(order.created_at);
              return d ? format(d, "dd MMM yyyy, HH:mm", { locale: id }) : "-";
            })()}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600">
            <Calendar className="w-4 h-4 mr-1" />
            Waktu Ambil:
          </div>
          <span className="font-medium">
            {(() => {
              const toDate = (val: any) => {
                if (!val) return null;
                if (typeof val === "number") {
                  return new Date(val < 1e12 ? val * 1000 : val);
                }
                if (typeof val === "string") {
                  const s = val.trim();
                  const d = new Date(s);
                  if (!isNaN(d.getTime())) return d;
                  const d2 = new Date(s.replace(" ", "T"));
                  if (!isNaN(d2.getTime())) return d2;
                }
                return null;
              };
              let d = toDate(order.pickup_date);
              if (!d) {
                const pickupAny = order.pickup_at ?? (order as any)?.pickupAt;
                d = toDate(pickupAny);
              }
              const dateStr = d
                ? format(d, "dd MMM yyyy", { locale: id })
                : "-";
              const timeStr = order.pickup_time || "";
              const formatted = `${dateStr}${timeStr ? ", " + timeStr : ""}`;
              if (formatted !== "-" && formatted.trim() !== "-") {
                return formatted;
              }
              // Fallback: tampilkan catatan atau alamat pengiriman jika memuat info pengambilan
              const notes = String(order.notes || "").trim();
              const shipping = String(
                (order as any)?.shipping_address || ""
              ).trim();
              const fallbackText = notes || shipping;
              return fallbackText || "-";
            })()}
          </span>
        </div>

        {order.status === "completed" &&
        (order.picked_up_at || order.picked_up_by) ? (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-gray-600">
              <CheckCircle className="w-4 h-4 mr-1" />
              Diambil:
            </div>
            <span className="font-medium">
              {(() => {
                const toDate = (val: any) => {
                  if (!val) return null;
                  if (typeof val === "number") {
                    return new Date(val < 1e12 ? val * 1000 : val);
                  }
                  if (typeof val === "string") {
                    const s = val.trim();
                    const d = new Date(s);
                    if (!isNaN(d.getTime())) return d;
                    const d2 = new Date(s.replace(" ", "T"));
                    if (!isNaN(d2.getTime())) return d2;
                  }
                  return null;
                };
                const d = toDate(order.picked_up_at);
                const dateStr = d
                  ? format(d, "dd MMM yyyy, HH:mm", { locale: id })
                  : "-";
                const byStr = String(order.picked_up_by || "").trim();
                return byStr ? `${dateStr} oleh ${byStr}` : dateStr;
              })()}
            </span>
          </div>
        ) : null}

        {isAdmin && !["cancelled", "rejected"].includes(order.status) && (
          <div className="mt-2">
            {!editingPickup ? (
              <Button variant="outline" size="sm" onClick={toggleEditPickup}>
                Edit Jadwal Ambil
              </Button>
            ) : (
              <div className="flex flex-col gap-2 p-3 border rounded-md">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-24">Tanggal</span>
                    <Input
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-24">Jam</span>
                    <Input
                      type="time"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm text-gray-600 w-24">Alasan</span>
                  <Textarea
                    rows={2}
                    placeholder="Tulis alasan perubahan jadwal ambil"
                    value={pickupReason}
                    onChange={(e) => setPickupReason(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingPickup(false)}
                    disabled={isUpdatingPickup}
                  >
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSavePickup}
                    disabled={isUpdatingPickup}
                  >
                    {isUpdatingPickup ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <Separator className="my-2" />

        {/* Products */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Detail Produk:</p>
          {(() => {
            const resolveImageUrl = (img: any): string => {
              const fallback = "/product-thumbnail.png";
              if (!img) return fallback;
              if (typeof img === "string") return img || fallback;
              if (Array.isArray(img)) {
                const first = img[0];
                if (!first) return fallback;
                if (typeof first === "string") return first;
                if (typeof first === "object") {
                  return (
                    String(
                      (first as any).secure_url ||
                        (first as any).url ||
                        (first as any).src ||
                        (first as any).path ||
                        ""
                    ) || fallback
                  );
                }
                return fallback;
              }
              if (typeof img === "object") {
                return (
                  String(
                    (img as any).secure_url ||
                      (img as any).url ||
                      (img as any).src ||
                      (img as any).path ||
                      ""
                  ) || fallback
                );
              }
              return fallback;
            };

            const fromOrderItems = (): Array<{
              name: string;
              image: string;
              quantity: number;
              size: string;
              price: number;
              productId?: string;
              rating?: ProductRating;
            }> => {
              const items = Array.isArray((order as any)?.orderItems)
                ? (order as any).orderItems
                : [];

              if (items.length > 0) {
                console.log("DEBUG ORDER ITEMS [0]:", items[0]);
              }

              return items.map((it: any) => {
                const p = (it && it.product) || {};
                const price = Number(it?.price ?? p?.price ?? 0) || 0;
                const quantity = Number(it?.quantity ?? 0) || 0;

                // Prioritize item snapshot image or variant image
                const imgSource =
                  it?.image ||
                  it?.imageUrl ||
                  (it?.variant && it.variant.image) ||
                  p?.imageUrl ||
                  p?.image;

                const rawRating = it.rating || it.user_rating || it.Review;

                return {
                  name: String(p?.name || "Produk") || "Produk",
                  image: resolveImageUrl(imgSource),
                  quantity,
                  size: String(p?.size || "-") || "-",
                  price,
                  productId: String(p?.id || it?.productId || ""),
                  rating: rawRating,
                };
              });
            };

            console.log("DEBUG ORDER DATA:", order);

            const products =
              Array.isArray(order?.products) && order.products.length > 0
                ? order.products.map((p) => {
                    const rawRating =
                      p.rating || (p as any).user_rating || (p as any).Review;
                    return {
                      name: p.name,
                      image: p.image,
                      quantity: Number(p.quantity) || 0,
                      size: p.size,
                      price: Number(p.price) || 0,
                      productId: String(p.product_id || (p as any)?.id || ""),
                      rating: rawRating,
                    };
                  })
                : fromOrderItems();

            if (products.length === 0) {
              return <p className="text-xs text-gray-500">Tidak ada produk</p>;
            }

            const visibleProducts = isExpanded
              ? products
              : products.slice(0, 1);
            const remainingCount = products.length - 1;

            return (
              <div className="flex flex-col gap-2">
                {visibleProducts.map((product, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-2 p-2 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-start gap-3 w-full">
                      <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0">
                        <Image
                          src={product.image || "/product-thumbnail.png"}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {product.size}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2 text-sm text-gray-500 line-through">
                          {/* Contoh harga coret jika ada diskon, sementara placeholder */}
                          {/* formatRupiah(Number(product.price) * 1.2) */}
                        </div>
                        <p className="text-sm font-semibold">
                          {formatRupiah(Number(product.price))}
                        </p>
                        <p className="text-xs text-gray-500">
                          x{product.quantity}
                        </p>
                      </div>
                    </div>

                    {order.status === "completed" && (
                      <div className="flex flex-col gap-3 pt-2 border-t border-gray-100 w-full">
                        {/* Tampilkan konten ulasan jika sudah ada */}
                        {product.rating && (
                          <div className="bg-gray-50 p-3 rounded-md text-sm border border-gray-100">
                            <div className="flex items-center gap-1 mb-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <FaStar
                                  key={star}
                                  className={
                                    star <= product.rating!.rating
                                      ? "text-yellow-400"
                                      : "text-gray-300"
                                  }
                                  size={14}
                                />
                              ))}
                              <span className="text-gray-500 text-xs ml-1 font-medium">
                                ({product.rating.rating}/5)
                              </span>
                            </div>

                            {product.rating.comment && (
                              <p className="text-gray-700 mb-2 italic">
                                &quot;{product.rating.comment}&quot;
                              </p>
                            )}

                            {product.rating.reply && (
                              <div className="mt-2 pl-3 border-l-2 border-primary/50 bg-white p-2 rounded-r-md shadow-sm">
                                <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                  Balasan Admin
                                </p>
                                <p className="text-sm text-gray-600">
                                  {product.rating.reply}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tombol Beri Ulasan HANYA muncul jika BELUM ada rating DAN bukan admin */}
                        {!product.rating && !isAdmin && (
                          <div className="flex justify-end">
                            <RatingDialog
                              productId={String(product.productId)}
                              orderId={String(order.db_id || order.order_id)}
                              productName={product.name}
                              existingRating={null}
                              trigger={
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2 h-8 text-xs"
                                >
                                  <FaStar className="text-gray-400" />
                                  Beri Ulasan
                                </Button>
                              }
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {products.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-gray-500 hover:text-gray-900"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded
                      ? "Tampilkan lebih sedikit"
                      : `Lihat ${remainingCount} produk lainnya`}
                  </Button>
                )}
              </div>
            );
          })()}
        </div>

        {/* Notes */}
        {(() => {
          const notesText = String(
            order.notes ||
              (order as any)?.shippingAddress ||
              (order as any)?.shipping_address ||
              ""
          ).trim();
          if (!notesText) return null;
          return (
            <div className="mt-2 p-2 bg-blue-50 rounded-md border border-blue-100">
              <p className="text-xs text-gray-600 mb-1">Catatan:</p>
              <p className="text-sm text-gray-800">{notesText}</p>
            </div>
          );
        })()}

        {/* Total */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm font-medium text-gray-700">
            Total Pembayaran:
          </span>
          <span className="text-lg font-bold text-primary">
            {(() => {
              const total =
                typeof order.total_amount === "number"
                  ? order.total_amount
                  : Number(order.total_amount) || 0;
              return formatRupiah(total);
            })()}
          </span>
        </div>

        {/* Info pembayaran & alamat */}
        {(() => {
          const method =
            (order as any)?.paymentMethod ||
            (order as any)?.payment_method ||
            (order as any)?.method ||
            "";
          const methodCode =
            (order as any)?.paymentMethodCode ||
            (order as any)?.payment_method_code ||
            "";

          const methodDisplay = methodCode
            ? `${method} (${methodCode})`
            : method;

          const shippingAddress =
            (order as any)?.shippingAddress ||
            (order as any)?.shipping_address ||
            "";
          const pickupAny =
            (order as any)?.pickupAt || (order as any)?.pickup_at || null;
          const pickupReasonAny = String(
            (order as any)?.pickup_reason ||
              (order as any)?.pickupReason ||
              (order as any)?.pickupChangeReason ||
              ""
          ).trim();
          const pickupDisplay = (() => {
            if (!pickupAny) return "";
            const d = new Date(pickupAny);
            if (isNaN(d.getTime())) return "";
            return format(d, "dd MMM yyyy, HH:mm", { locale: id });
          })();
          const showAny = Boolean(
            method || shippingAddress || pickupDisplay || pickupReasonAny
          );
          if (!showAny) return null;
          return (
            <div className="mt-3 space-y-2">
              {pickupDisplay ? (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-1" /> Pickup Dijadwalkan:
                  </div>
                  <span className="font-medium">{pickupDisplay}</span>
                </div>
              ) : null}
              {pickupReasonAny ? (
                <div className="flex items-start justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    Alasan perubahan:
                  </div>
                  <span className="font-medium text-right max-w-[60%] break-words">
                    {pickupReasonAny}
                  </span>
                </div>
              ) : null}
              {shippingAddress ? (
                <div className="flex items-start justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    Alamat / Catatan:
                  </div>
                  <span className="font-medium text-right max-w-[60%] break-words">
                    {String(shippingAddress)}
                  </span>
                </div>
              ) : null}
              {method ? (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    Metode Pembayaran:
                  </div>
                  <span className="font-medium">{String(methodDisplay)}</span>
                </div>
              ) : null}
            </div>
          );
        })()}

        {/* Aksi invoice (admin) */}
        {canResendInvoice ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={previewHref} target="_blank" rel="noopener noreferrer">
                Pratinjau Invoice
              </a>
            </Button>
            <Button asChild size="sm">
              <a href={downloadHref} target="_blank" rel="noopener noreferrer">
                Unduh Invoice
              </a>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleResendInvoice}
              disabled={resending}
            >
              {resending ? "Mengirim…" : "Kirim Ulang Invoice PDF"}
            </Button>
          </div>
        ) : null}
      </CardContent>

      {(() => {
        const actionButtons = renderActionButtons();
        const footerContent = actionButtons || noticeForUser;
        if (!footerContent) return null;
        return (
          <>
            <Separator />
            <CardFooter className="pt-4">{footerContent}</CardFooter>
          </>
        );
      })()}
    </Card>
  );
};

export default OrderCard;
