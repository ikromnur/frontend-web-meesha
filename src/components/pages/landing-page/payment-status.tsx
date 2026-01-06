"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/helper/format-rupiah";
import { useSearchParams } from "next/navigation";
import PickupScheduleSelector, {
  PickupScheduleValue,
} from "@/features/orders/components/pickup-schedule-selector";
import {
  OPERATING_START_HOUR,
  OPERATING_END_HOUR,
} from "@/features/orders/utils/pickup";
import api from "@/lib/api";

type TripayInstructionItem = {
  title?: string;
  steps?: string[];
};

type TripayInstructionPayload = {
  method?: string;
  amount?: number;
  pay_code?: string; // VA number
  va_number?: string; // alternative key
  expired_time?: number; // epoch seconds
  expired_at?: number | string; // variant
  qr_string?: string;
  qr_url?: string;
  instructions?: TripayInstructionItem[];
};

const formatExpiry = (value?: number | string) => {
  if (value === undefined || value === null) return null;
  let date: Date | null = null;
  if (typeof value === "number") {
    // Tripay usually returns epoch seconds
    const ms = value < 10_000_000_000 ? value * 1000 : value;
    date = new Date(ms);
  } else if (typeof value === "string") {
    // Try parse ISO
    const d = new Date(value);
    date = isNaN(d.getTime()) ? null : d;
  }
  return date ? date.toLocaleString() : null;
};

const copyToClipboard = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
    alert("Disalin ke clipboard");
  } catch {}
};

export default function PaymentStatusPage({ orderId }: { orderId: string }) {
  const [payload, setPayload] = useState<TripayInstructionPayload | null>(null);
  const [statusText, setStatusText] = useState<string>("");
  const [methodName, setMethodName] = useState<string>("");
  const [orderStatus, setOrderStatus] = useState<string>("");
  const searchParams = useSearchParams();

  useEffect(() => {
    // Try read instructions from sessionStorage set at checkout
    try {
      const raw = sessionStorage.getItem(`tripay:instructions:${orderId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Accept either data or root
        const p: TripayInstructionPayload = parsed?.data || parsed;
        setPayload(p);
      }
    } catch {}
  }, [orderId]);

  useEffect(() => {
    // Fallback: fetch dari API menggunakan reference/merchantRef
    const refParam =
      searchParams.get("reference") ||
      searchParams.get("ref") ||
      searchParams.get("merchantRef") ||
      searchParams.get("merchant_ref") ||
      searchParams.get("order") ||
      orderId;
    // const q = `merchantRef=${encodeURIComponent(refParam!)}`;
    const run = async () => {
      try {
        // Gunakan path-based fetching untuk konsistensi dan memanfaatkan fallback di [id]/route.ts
        const { data: json } = await api.get(
          `/api/payments/tripay/transaction/${encodeURIComponent(refParam!)}`
        );
        const data = json?.data ?? json;
        if (json && data) {
          const instr: TripayInstructionPayload = data?.instructions || data;
          setPayload(instr);
          setStatusText(String(data?.status || "").toUpperCase());
          setMethodName(String(data?.payment_name || data?.method || ""));
        }
      } catch {}
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, searchParams]);

  // Ambil status order dari backend (PROCESSING/COMPLETED dianggap sukses untuk pelanggan)
  useEffect(() => {
    const run = async () => {
      try {
        const { data: json } = await api.get(
          `/api/orders/${encodeURIComponent(orderId)}`
        );
        const data = json?.data ?? json;
        const st = String(
          data?.status || data?.order_status || ""
        ).toLowerCase();
        if (st) setOrderStatus(st);
      } catch {}
    };
    run();
  }, [orderId]);

  const vaNumber = useMemo(
    () => payload?.pay_code || payload?.va_number || null,
    [payload]
  );
  const qrString = useMemo(() => payload?.qr_string || null, [payload]);
  const amount = useMemo(() => payload?.amount ?? null, [payload]);
  const expiryText = useMemo(
    () => formatExpiry(payload?.expired_time ?? payload?.expired_at),
    [payload]
  );
  const instructions = useMemo(() => payload?.instructions || [], [payload]);
  const isTripayPaid = useMemo(() => {
    const s = String(statusText || "").toUpperCase();
    return s === "PAID" || s === "SUCCESS" || s === "COMPLETED";
  }, [statusText]);
  const isOrderSuccess = useMemo(() => {
    const s = String(orderStatus || "").toLowerCase();
    return s === "processing" || s === "completed";
  }, [orderStatus]);
  const showSuccessView = isTripayPaid || isOrderSuccess;

  // Penjadwalan pickup setelah pembayaran sukses
  const [pickupValue, setPickupValue] = useState<PickupScheduleValue>({
    date: "",
    time: "",
  });
  const [savingPickup, setSavingPickup] = useState(false);
  const earliestDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const isReadyOnlyOrder = false; // Backend akan menegakkan H+2 jika Pre-Order

  const handleSavePickup = async () => {
    if (!pickupValue.date || !pickupValue.time) {
      alert("Pilih tanggal dan jam mulai pickup");
      return;
    }
    try {
      setSavingPickup(true);
      const { data: js } = await api.post(
        `/api/orders/${encodeURIComponent(orderId)}/pickup-schedule`,
        {
          date: pickupValue.date,
          start: pickupValue.time,
        }
      );
      if (!js?.success && !js?.data) {
        alert(js?.message || js?.error || "Gagal menyimpan jadwal pickup");
        return;
      }
      alert("Jadwal pickup berhasil disimpan");
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setSavingPickup(false);
    }
  };

  return (
    <div className="relative w-full max-w-screen-md mx-auto px-4 py-6 space-y-6">
      <h2 className="text-2xl font-semibold">Status Pembayaran</h2>
      <p className="text-sm text-muted-foreground">Order ID: {orderId}</p>
      <Separator />

      {!payload && (
        <div className="text-sm text-muted-foreground">
          Tidak ada instruksi ditemukan. Silakan kembali ke halaman checkout dan
          lakukan pembayaran.
        </div>
      )}

      {payload && (
        <div className="space-y-6">
          <section className="space-y-3">
            <h4 className="text-lg font-medium">Ringkasan</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center justify-between border rounded-md p-4 bg-primary/5">
                <span className="text-sm text-[#6C6C6C]">Total Bayar</span>
                <span className="text-lg font-semibold">
                  {amount ? formatRupiah(amount) : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between border rounded-md p-4">
                <span className="text-sm text-[#6C6C6C]">Metode</span>
                <span className="font-semibold">{methodName || "-"}</span>
              </div>
              <div className="flex items-center justify-between border rounded-md p-4">
                <span className="text-sm text-[#6C6C6C]">Batas Waktu</span>
                <span className="font-semibold">{expiryText || "-"}</span>
              </div>
              <div className="flex items-center justify-between border rounded-md p-4">
                <span className="text-sm text-[#6C6C6C]">Status</span>
                <span
                  className={`px-2 py-1 text-xs rounded-md ${
                    showSuccessView
                      ? "bg-green-100 text-green-700"
                      : statusText === "EXPIRED" || statusText === "FAILED"
                      ? "bg-red-100 text-red-700"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {showSuccessView ? "PAID" : statusText || "-"}
                </span>
              </div>
            </div>
          </section>

          {showSuccessView ? (
            <section className="space-y-4 text-center py-12 border rounded-md">
              <div className="text-5xl">🎉</div>
              <h3 className="text-xl font-semibold">Pembayaran Berhasil</h3>
              <p className="text-sm text-muted-foreground">
                Terima kasih! Pesanan Anda akan segera diproses oleh admin.
              </p>
              {/* Penjadwalan Pickup setelah pembayaran sukses */}
              <div className="mt-6 text-left">
                <h4 className="text-lg font-medium">Atur Jadwal Pickup</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Jam operasional:{" "}
                  {String(OPERATING_START_HOUR).padStart(2, "0")}:00–
                  {String(OPERATING_END_HOUR).padStart(2, "0")}:00. Pilih jam
                  mulai (HH:mm).
                </p>
                <PickupScheduleSelector
                  earliestAvailableDate={earliestDate}
                  isReadyOnlyOrder={isReadyOnlyOrder}
                  value={pickupValue}
                  onChange={(v) => setPickupValue(v)}
                />
                <div className="flex items-center justify-end gap-2 mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.location.assign("/")}
                  >
                    Kembali ke Home
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSavePickup}
                    disabled={savingPickup}
                  >
                    {savingPickup ? "Menyimpan…" : "Simpan Jadwal"}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  type="button"
                  onClick={() => window.location.assign("/")}
                >
                  Kembali ke Home
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    window.open(
                      `/api/orders/${encodeURIComponent(
                        orderId
                      )}/invoice/download`,
                      "_blank"
                    )
                  }
                >
                  Download Invoice (PDF)
                </Button>
              </div>
            </section>
          ) : (
            <>
              {vaNumber && (
                <section className="space-y-2">
                  <h4 className="text-lg font-medium">Kode Virtual Account</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border rounded-md p-3 font-mono bg-muted">
                      {vaNumber}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => copyToClipboard(vaNumber!)}
                    >
                      Salin
                    </Button>
                  </div>
                </section>
              )}

              {qrString && (
                <section className="space-y-2">
                  <h4 className="text-lg font-medium">QRIS</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border rounded-md p-3 font-mono break-words bg-muted">
                      {qrString}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => copyToClipboard(qrString!)}
                    >
                      Salin
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Scan atau salin string QR di aplikasi pembayaran Anda.
                  </p>
                </section>
              )}

              {instructions?.length ? (
                <section className="space-y-3">
                  <h4 className="text-lg font-medium">Langkah Pembayaran</h4>
                  <div className="space-y-4">
                    {instructions.map((ins, idx) => (
                      <div
                        key={idx}
                        className="border rounded-md p-4 space-y-2"
                      >
                        {ins.title && (
                          <h6 className="font-semibold">{ins.title}</h6>
                        )}
                        <ol className="list-decimal list-inside space-y-1 text-sm">
                          {(ins.steps || []).map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Tidak ada langkah yang disediakan untuk metode ini.
                </div>
              )}
            </>
          )}

          {!showSuccessView && (
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                onClick={() => window.location.assign("/checkout")}
              >
                Kembali ke Checkout
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
