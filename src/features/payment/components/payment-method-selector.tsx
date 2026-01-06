"use client";

import React from "react";
import { useTripayChannels } from "@/features/payment/api/use-tripay-channels";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

type Props = {
  value: string | null;
  onChange: (code: string) => void;
  allowed?: string[]; // jika tidak diset, tampilkan semua channel aktif
};

export const PaymentMethodSelector: React.FC<Props> = ({
  value,
  onChange,
  allowed,
}) => {
  const { data, isLoading } = useTripayChannels();
  const allChannels = data?.data || [];
  const resolveLogo = (code: string, name: string): string | null => {
    const c = (code || "").toUpperCase();
    const n = (name || "").toUpperCase();
    // Match by Tripay code first (exact/common variants), then by name keywords
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
  // Jika prop allowed diberikan, filter berdasarkan daftar tersebut.
  // Jika tidak ada (undefined/null), tampilkan semua channel aktif dari backend.
  // Jika hasil filter kosong (mismatch kode), fallback ke semua channel agar pengguna tetap bisa memilih.
  const channels =
    Array.isArray(allowed) && allowed.length > 0
      ? allChannels.filter((c) => allowed.includes(c.code)).length > 0
        ? allChannels.filter((c) => allowed.includes(c.code))
        : allChannels
      : allChannels;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h6 className="font-medium text-sm text-[#6C6C6C]">Metode Pembayaran</h6>
      <RadioGroup
        value={value ?? undefined}
        onValueChange={onChange}
        className="grid grid-cols-2 md:grid-cols-3 gap-3"
      >
        {channels.map((c) => (
          <div
            key={c.code}
            className={`flex items-center gap-2 border rounded-md p-3 hover:shadow-sm transition-colors ${
              value === c.code
                ? "ring-2 ring-primary bg-primary/5 border-primary"
                : "hover:bg-muted"
            }`}
          >
            <RadioGroupItem id={`pm-${c.code}`} value={c.code} />
            {/* Logo */}
            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center overflow-hidden">
              {(() => {
                const src = resolveLogo(c.code, c.name);
                if (src) {
                  return (
                    <Image
                      src={src}
                      alt={c.name}
                      width={32}
                      height={32}
                      className="h-8 w-8 object-contain"
                    />
                  );
                }
                const badge = c.code.includes("QR") ? "QR" : "VA";
                return (
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {badge}
                  </span>
                );
              })()}
            </div>
            <Label htmlFor={`pm-${c.code}`} className="cursor-pointer">
              <span className="block text-sm font-medium leading-tight">
                {c.name}
              </span>
              <span className="block text-xs text-muted-foreground">
                {c.group ||
                  (c.code.includes("QR") ? "QRIS" : "Virtual Account")}
              </span>
            </Label>
          </div>
        ))}
        {channels.length === 0 && (
          <div className="text-xs text-muted-foreground col-span-2">
            Tidak ada channel aktif untuk pilihan ini.
          </div>
        )}
      </RadioGroup>
    </div>
  );
};
