"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatRupiah } from "@/helper/format-rupiah";
import api from "@/lib/api";

type TripayStatus = "UNPAID" | "PAID" | "PENDING" | "FAILED" | "EXPIRED" | string;

export default function OrderStatusPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const statusText = useMemo(() => {
    const s: TripayStatus = (data?.status as TripayStatus) || "UNPAID";
    switch (s) {
      case "PAID":
        return "Sudah dibayar";
      case "UNPAID":
      case "PENDING":
        return "Menunggu pembayaran";
      case "EXPIRED":
        return "Kadaluarsa";
      case "FAILED":
        return "Gagal";
      default:
        return s;
    }
  }, [data?.status]);

  // Ambil status dari backend dan fallback ke sessionStorage
  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/api/payments/tripay/transaction/${encodeURIComponent(id)}`);
        const json = res.data || {};
        if ((res.status >= 200 && res.status < 300) && (json?.data || json?.success)) {
          const payload = json?.data ?? json;
          if (!cancelled) setData(payload);
        } else {
          // Fallback ke sessionStorage jika API belum tersedia
          const raw = sessionStorage.getItem(`tripay:instructions:${id}`);
          if (raw && !cancelled) {
            setData(JSON.parse(raw));
          }
          if (!cancelled) setError(json?.message || "Gagal mengambil status transaksi");
        }
      } catch (e: any) {
        const raw = sessionStorage.getItem(`tripay:instructions:${id}`);
        if (raw && !cancelled) {
          setData(JSON.parse(raw));
        }
        if (!cancelled) setError(e?.message || "Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStatus();
    const timer = setInterval(fetchStatus, 10000); // polling 10s
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id]);

  const instructions: any[] = Array.isArray(data?.instructions) ? data.instructions : [];
  const paymentUrl: string | undefined = typeof data?.payment_url === "string" ? data.payment_url : undefined;
  const amount = typeof data?.amount === "number" ? data.amount : undefined;
  const method = data?.method || data?.payment_method || data?.channel;
  const payCode = data?.pay_code || data?.va_number || data?.bill_key;
  const expiredAt = data?.expired_time || data?.expired_at;
  const expiredText = expiredAt ? new Date(typeof expiredAt === "number" ? expiredAt * 1000 : expiredAt).toLocaleString() : undefined;

  // Countdown sampai kadaluarsa
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  useEffect(() => {
    const expiredMs = expiredAt
      ? typeof expiredAt === "number"
        ? expiredAt * 1000
        : new Date(expiredAt).getTime()
      : undefined;
    if (!expiredMs) {
      setRemainingMs(null);
      return;
    }
    setRemainingMs(Math.max(expiredMs - Date.now(), 0));
    const t = setInterval(() => {
      setRemainingMs((prev) => {
        const next = Math.max(expiredMs - Date.now(), 0);
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [expiredAt]);

  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  // QRIS rendering
  const isQRIS = String(method || "").toUpperCase().includes("QRIS");
  const qrImage: string | undefined =
    (typeof data?.qr_image === "string" ? data.qr_image : undefined) ||
    (typeof data?.qr_image_url === "string" ? data.qr_image_url : undefined) ||
    (typeof data?.qrUrl === "string" ? data.qrUrl : undefined);
  const qrString: string | undefined = typeof data?.qr_string === "string" ? data.qr_string : undefined;

  const copyPayCode = async () => {
    if (!payCode) return;
    try {
      await navigator.clipboard.writeText(String(payCode));
      alert("Kode bayar disalin");
    } catch {}
  };

  return (
    <div className="w-full max-w-screen-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-2">Status Pesanan</h1>
      <p className="text-sm text-muted-foreground">Nomor pesanan: {id}</p>
      <Separator className="my-4" />

      {loading && <div className="text-sm text-muted-foreground mb-4">Memuat status...</div>}
      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      <div className="space-y-2 mb-6">
        <div className="flex justify-between">
          <span className="text-sm">Status</span>
          <span className="text-sm font-medium">{statusText}</span>
        </div>
        {amount !== undefined && (
          <div className="flex justify-between">
            <span className="text-sm">Jumlah dibayar</span>
            <span className="text-sm font-medium">{formatRupiah(amount)}</span>
          </div>
        )}
        {method && (
          <div className="flex justify-between">
            <span className="text-sm">Metode</span>
            <span className="text-sm font-medium">{String(method)}</span>
          </div>
        )}
        {expiredText && (
          <div className="flex justify-between">
            <span className="text-sm">Kadaluarsa</span>
            <span className="text-sm font-medium">{expiredText}</span>
          </div>
        )}
        {remainingMs !== null && (
          <div className="flex justify-between">
            <span className="text-sm">Sisa waktu</span>
            <span className={`text-sm font-medium ${remainingMs === 0 ? "text-red-600" : ""}`}>{formatCountdown(remainingMs)}</span>
          </div>
        )}
        {payCode && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Kode Bayar / VA</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{String(payCode)}</span>
              <Button variant="outline" size="sm" onClick={copyPayCode}>Salin</Button>
            </div>
          </div>
        )}
      </div>

      {isQRIS && (qrImage || qrString) && (
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-2">QRIS Pembayaran</h2>
          {qrImage ? (
            <div className="border rounded-md p-4 inline-block bg-white">
              <img src={qrImage} alt="QRIS" className="w-56 h-56 object-contain" />
            </div>
          ) : null}
          {qrString ? (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm">QR String:</span>
              <span className="text-sm font-medium break-all">{qrString}</span>
            </div>
          ) : null}
        </div>
      )}

      {paymentUrl && (
        <div className="mb-6">
          <p className="text-sm mb-2">Anda dapat melanjutkan proses pembayaran melalui halaman berikut:</p>
          <Button onClick={() => window.open(paymentUrl, "_blank")}>Buka Halaman Pembayaran</Button>
        </div>
      )}

      {instructions.length > 0 ? (
        <div>
          <h2 className="text-lg font-medium mb-2">Instruksi Pembayaran</h2>
          <ul className="list-disc ml-5 text-sm">
            {instructions.map((ins, idx) => (
              <li key={idx}>{typeof ins === "string" ? ins : JSON.stringify(ins)}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          Belum ada instruksi tersimpan untuk pesanan ini. Jika Anda sudah membuat transaksi, coba kembali dari halaman checkout atau cek email Anda untuk panduan pembayaran.
        </div>
      )}

      <div className="flex gap-3 mt-8">
        <Button variant="secondary" onClick={() => router.push("/")}>Kembali ke Beranda</Button>
        <Button variant="outline" onClick={() => router.push("/cart")}>Kembali ke Keranjang</Button>
      </div>
    </div>
  );
}
