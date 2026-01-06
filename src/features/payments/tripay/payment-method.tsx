"use client";

import { useEffect, useState } from "react";
import { useTripayChannels, TripayChannel } from "./use-tripay-channels";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

type PaymentMethodProps = {
  totalPrice: number;
  codeFilter?: string; // e.g., 'QRIS'
  onSelect?: (code: string) => void;
  onContinue?: (code: string) => void;
};

export function PaymentMethod({
  totalPrice,
  codeFilter,
  onSelect,
  onContinue,
}: PaymentMethodProps) {
  const [tripayLoading, setTripayLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const DEFAULT_METHOD = (
    process.env.NEXT_PUBLIC_PAYMENT_DEFAULT_METHOD || ""
  ).toUpperCase();

  const { data, isLoading, isError, error } = useTripayChannels({
    code: codeFilter,
    enabled: totalPrice > 0,
  });

  useEffect(() => {
    setTripayLoading(isLoading);
  }, [isLoading]);

  const channels: TripayChannel[] = data?.data ?? [];

  // Auto-pilih metode: pulihkan dari sessionStorage atau ambil channel pertama
  useEffect(() => {
    if (tripayLoading) return;
    if (!paymentMethod && channels.length > 0) {
      try {
        const last =
          typeof window !== "undefined"
            ? sessionStorage.getItem("payment:lastMethod")
            : null;
        const preferred =
          typeof window !== "undefined"
            ? localStorage.getItem("payment:preferredMethod")
            : null;
        const hasPreferred =
          preferred && channels.some((c) => c.code === preferred);
        const exists = last && channels.some((c) => c.code === last);
        const hasEnvDefault =
          DEFAULT_METHOD &&
          channels.some((c) => String(c.code).toUpperCase() === DEFAULT_METHOD);
        // Preferensi default: QRIS bila tersedia
        const qris = channels.find(
          (c) =>
            String(c.code).toUpperCase() === "QRIS" ||
            String(c.group).toUpperCase() === "QRIS"
        );
        const next = hasEnvDefault
          ? channels.find(
              (c) => String(c.code).toUpperCase() === DEFAULT_METHOD
            )!.code
          : hasPreferred
          ? (preferred as string)
          : exists
          ? (last as string)
          : qris
          ? qris.code
          : channels[0].code;
        setPaymentMethod(next);
        onSelect?.(next);
      } catch {
        const qris = channels.find(
          (c) =>
            String(c.code).toUpperCase() === "QRIS" ||
            String(c.group).toUpperCase() === "QRIS"
        );
        const next = qris ? qris.code : channels[0].code;
        setPaymentMethod(next);
        onSelect?.(next);
      }
    }
  }, [tripayLoading, channels, paymentMethod, onSelect]);

  const resolveLogo = (code: string, name: string): string | null => {
    const c = (code || "").toUpperCase();
    const n = (name || "").toUpperCase();
    // Prefer matching by code, then fallback to name keywords
    if (c === "BCAVA" || c.includes("BCA")) return "/BCA.png";
    if (c === "BNIVA" || c.includes("BNI")) return "/BNI.png";
    if (c === "BRIVA" || c.includes("BRI")) return "/BRI.png";
    if (c === "MANDIRIVA" || c.includes("MANDIRI")) return "/Mandiri.png";
    if (c === "QRIS" || c.includes("QR")) return "/QRIS.png";
    if (n.includes("BCA")) return "/BCA.png";
    if (n.includes("BNI")) return "/BNI.png";
    if (n.includes("BRI")) return "/BRI.png";
    if (n.includes("MANDIRI")) return "/Mandiri.png";
    if (n.includes("QR") || n.includes("QRIS")) return "/QRIS.png";
    return null;
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Metode Pembayaran</h3>

      {tripayLoading && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
      )}

      {!tripayLoading && isError && (
        <div className="text-sm text-destructive">
          Gagal memuat channel: {String((error as Error)?.message ?? "Unknown")}
        </div>
      )}

      {!tripayLoading && !isError && channels.length === 0 && (
        <div className="text-sm text-muted-foreground">
          Tidak ada channel aktif. Aktifkan minimal QRIS di sandbox.
        </div>
      )}

      {!tripayLoading && channels.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {channels.map((ch) => {
            const selected = paymentMethod === ch.code;
            const groupLabel =
              ch.group || (ch.code.includes("QR") ? "QRIS" : "Virtual Account");
            return (
              <button
                key={ch.code}
                onClick={() => {
                  setPaymentMethod(ch.code);
                  onSelect?.(ch.code);
                  try {
                    sessionStorage.setItem("payment:lastMethod", ch.code);
                    localStorage.setItem("payment:preferredMethod", ch.code);
                  } catch {}
                }}
                className={`group relative border rounded-md p-3 text-left flex items-center gap-3 hover:shadow-sm transition-colors ${
                  selected
                    ? "ring-2 ring-primary bg-primary/5 border-primary"
                    : "hover:bg-muted"
                }`}
              >
                <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                  {(() => {
                    const src = resolveLogo(ch.code, ch.name);
                    if (src) {
                      return (
                        <Image
                          src={src}
                          alt={ch.name}
                          width={36}
                          height={36}
                          className="h-9 w-9 object-contain"
                        />
                      );
                    }
                    return (
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {groupLabel === "QRIS" ? "QR" : "VA"}
                      </span>
                    );
                  })()}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium leading-tight">
                    {ch.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {groupLabel}
                  </div>
                </div>
                {typeof ch.fee_customer === "number" && ch.fee_customer > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    + {new Intl.NumberFormat("id-ID").format(ch.fee_customer)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="pt-2">
        <Button
          disabled={tripayLoading || !paymentMethod || totalPrice <= 0}
          onClick={() => {
            if (paymentMethod) onContinue?.(paymentMethod);
          }}
        >
          Lanjutkan
        </Button>
      </div>
    </div>
  );
}

export default PaymentMethod;
