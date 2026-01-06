"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { formatRupiah } from "@/helper/format-rupiah";
import { api } from "@/lib/api";

type ProductItem = {
  name: string;
  image?: string;
  quantity: number;
  price: number;
  size?: string;
};

type DiscountItem = {
  title: string;
  amount: number;
};

export default function PickupPage({ params }: { params: { id: string } }) {
  const orderId = params.id;
  const router = useRouter();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ambil order dari backend
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.message || "Gagal memuat order");
        setOrder(json?.data ?? json);
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Gagal memuat order");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [orderId]);

  const products: ProductItem[] = useMemo(() => {
    if (!order) return [];
    const resolveImageUrl = (img: any): string => {
      if (!img) return "/product-thumbnail.png";
      if (typeof img === "string") return img || "/product-thumbnail.png";
      if (Array.isArray(img)) return String(img[0] || "/product-thumbnail.png");
      if (typeof img === "object") {
        return (
          String(img?.secure_url || img?.url || img?.src || img?.path || "") ||
          "/product-thumbnail.png"
        );
      }
      return "/product-thumbnail.png";
    };

    const fromOrderItems = () => {
      const items = Array.isArray(order?.orderItems) ? order.orderItems : [];
      return items
        .filter((it: any) => Number(it?.price ?? 0) >= 0) // hanya produk (tanpa item diskon)
        .map((it: any) => {
          const p = it?.product || {};
          return {
            name: String(p?.name || it?.name || "Produk"),
            image: resolveImageUrl(p?.imageUrl ?? p?.image),
            quantity: Number(it?.quantity || 0),
            price: Number(it?.price ?? p?.price ?? 0),
            size: String(p?.size || "-"),
          } as ProductItem;
        });
    };

    if (Array.isArray(order?.products) && order.products.length > 0) {
      return order.products.map((p: any) => ({
        name: p?.name,
        image: resolveImageUrl(p?.image),
        quantity: Number(p?.quantity || 0),
        price: Number(p?.price || 0),
        size: String(p?.size || "-"),
      }));
    }
    return fromOrderItems();
  }, [order]);

  const totalAmount = useMemo(() => {
    return products.reduce(
      (sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0),
      0
    );
  }, [products]);

  // Ambil item diskon dari orderItems (price negatif)
  const discounts = useMemo<DiscountItem[]>(() => {
    const items = Array.isArray(order?.orderItems) ? order.orderItems : [];
    return items
      .filter((it: any) => Number(it?.price ?? 0) < 0)
      .map((it: any) => ({
        title: String(it?.name || "Diskon"),
        amount: Math.abs(Number(it?.price) || 0),
      }));
  }, [order]);
  const discountTotal = useMemo(
    () =>
      discounts.reduce(
        (s: number, d: DiscountItem) => s + (Number(d.amount) || 0),
        0
      ),
    [discounts]
  );
  const taxAmount = 0; // sesuai perubahan sebelumnya, tax hanya visual
  const grandTotal = useMemo(
    () =>
      Math.max(
        Number(totalAmount) - Number(discountTotal) + Number(taxAmount),
        0
      ),
    [totalAmount, discountTotal]
  );

  return (
    <div className="relative w-full max-w-screen-lg mx-auto px-4 py-6 space-y-6">
      <h2 className="text-2xl font-semibold">Pengambilan di Toko</h2>
      <p className="text-sm text-muted-foreground">Order ID: {orderId}</p>
      <Separator />

      {loading && (
        <p className="text-sm text-muted-foreground">Memuat order…</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="space-y-6">
          {/* Produk yang dibeli */}
          <Card className="w-full">
            <CardHeader>
              <h3 className="text-lg font-medium">Produk yang Dibeli</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {products.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Tidak ada produk pada order ini.
                </p>
              ) : (
                products.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-card/50"
                  >
                    <div className="w-24 h-24 rounded-md overflow-hidden bg-white flex-shrink-0 border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.image || "/product-thumbnail.png"}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <h4 className="font-semibold text-base leading-snug">
                          {p.name}
                        </h4>
                        {p.size && p.size !== "-" && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Varian:{" "}
                            <span className="font-medium text-foreground">
                              {p.size}
                            </span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-end justify-between mt-3 sm:mt-0">
                        <div className="text-sm text-muted-foreground">
                          {p.quantity} x {formatRupiah(Number(p.price) || 0)}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            {formatRupiah(
                              (Number(p.price) || 0) * (Number(p.quantity) || 0)
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {discounts.length > 0 && (
                <div className="pt-2">
                  <Separator className="my-2" />
                  <p className="text-sm font-medium">Diskon</p>
                  <div className="space-y-1 mt-1">
                    {discounts.map((d: DiscountItem, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm text-green-700"
                      >
                        <span>{d.title}</span>
                        <span>-{formatRupiah(Number(d.amount) || 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-1">
              <div className="flex items-center justify-between w-full">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatRupiah(totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between w-full">
                <span className="text-sm text-muted-foreground">Tax</span>
                <span className="font-medium">{formatRupiah(taxAmount)}</span>
              </div>
              <Separator className="my-2 w-full" />
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-medium">Total</span>
                <span className="font-semibold">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
            </CardFooter>
          </Card>

          {/* Konfirmasi Pengambilan */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-primary uppercase mb-4">
                  KONFIRMASI PENGAMBILAN PESANAN
                </h3>

                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-1">Rincian Pesanan:</h4>
                    <div className="grid grid-cols-[80px_1fr] gap-2">
                      <span className="text-muted-foreground">Produk:</span>
                      <span>
                        {products
                          .map((p) => `${p.name} (${p.quantity} pcs)`)
                          .join(", ")}
                      </span>

                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-semibold">
                        {formatRupiah(grandTotal)}
                      </span>
                    </div>
                  </div>

                  <Separator className="bg-primary/20" />

                  <div>
                    <h4 className="font-semibold mb-2">
                      Pesanan dijadwalkan untuk diambil pada:
                    </h4>
                    <div className="grid grid-cols-[80px_1fr] gap-2">
                      <span className="text-muted-foreground">Waktu:</span>
                      <span className="font-semibold">
                        {order?.pickupAt
                          ? `Pukul ${new Date(
                              order.pickupAt
                            ).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })} WIB`
                          : "Belum dijadwalkan"}
                      </span>

                      <span className="text-muted-foreground">Tempat:</span>
                      <span className="font-semibold">Meesha Store</span>

                      <span className="text-muted-foreground">Alamat:</span>
                      <span>
                        Jl. Sokka Petanahan No.554, Widarapayung, Kedawung, Kec.
                        Pejagoan, Kabupaten Kebumen, Jawa Tengah 54361
                      </span>

                      <span className="text-muted-foreground">Panduan:</span>
                      <a
                        href="https://maps.app.goo.gl/c6Kd7MNXw2knQgGz8?g_st=ipc"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Klik untuk melihat lokasi (Google Maps)
                      </a>
                    </div>
                  </div>

                  <div className="pt-4 text-center font-medium text-primary">
                    Terima kasih telah berbelanja di Meesha Store.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
