"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import api from "@/lib/api";
import { axiosInstance } from "@/lib/axios";

type TripayStatus =
  | "PAID"
  | "SUCCESS"
  | "COMPLETED"
  | "PENDING"
  | "PROCESSING"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

type TripayResponse = {
  success: boolean;
  data: {
    status: TripayStatus;
    merchant_ref: string;
    reference?: string;
    amount?: number;
    expired_time?: number; // epoch seconds
    method?: string;
    qr_image?: string;
  };
  message?: string;
};

export default function PaymentResultPage({
  params,
}: {
  params: { id: string };
}) {
  const orderId = params.id;
  const [effectiveId, setEffectiveId] = useState<string>(orderId);
  const searchParams = useSearchParams();
  const [data, setData] = useState<TripayResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasCancelled, setHasCancelled] = useState<boolean>(false);

  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "";

  const tryFetch = async (): Promise<TripayResponse> => {
    const candidates: string[] = [];
    // Ambil ref dari query: reference/ref atau merchantRef/merchant_ref/order
    const refParam =
      searchParams.get("reference") ||
      searchParams.get("ref") ||
      searchParams.get("merchantRef") ||
      searchParams.get("merchant_ref") ||
      searchParams.get("order") ||
      orderId;

    // Prioritaskan path-based fetching agar ditangani oleh [id]/route.ts dan backend controller
    // Backend controller sudah cerdas mendeteksi apakah path adalah UUID (merchantRef) atau Reference Tripay
    candidates.push(
      `/api/payments/tripay/transaction/${encodeURIComponent(refParam!)}`
    );

    // Prefer proxy dengan query string agar backend bisa membaca reference/merchantRef
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        refParam!
      );

    if (isUuid) {
      candidates.push(
        `/api/payments/tripay/transaction?merchantRef=${encodeURIComponent(
          refParam!
        )}`
      );
    } else {
      candidates.push(
        `/api/payments/tripay/transaction?reference=${encodeURIComponent(
          refParam!
        )}`
      );
    }
    // Terakhir, coba explicit orderId bila refParam berbeda
    if (refParam !== orderId) {
      const isOrderUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          orderId
        );
      if (isOrderUuid) {
        candidates.push(
          `/api/payments/tripay/transaction?merchantRef=${encodeURIComponent(
            orderId
          )}`
        );
      } else {
        candidates.push(
          `/api/payments/tripay/transaction/${encodeURIComponent(orderId)}`
        );
      }
    }
    if (backend) {
      const base = `${backend}/payments/tripay/transaction`;
      if (isUuid) {
        candidates.push(`${base}?merchantRef=${encodeURIComponent(refParam!)}`);
      } else {
        candidates.push(`${base}?reference=${encodeURIComponent(refParam!)}`);
      }
      candidates.push(`${base}/${encodeURIComponent(refParam!)}`);
      if (refParam !== orderId) {
        candidates.push(`${base}/${encodeURIComponent(orderId)}`);
        // Assuming orderId is UUID mostly, but let's just push it as merchantRef if it looks like one
        if (
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            orderId
          )
        ) {
          candidates.push(`${base}?merchantRef=${encodeURIComponent(orderId)}`);
        }
      }
    }

    let lastErr: any = null;
    for (const url of candidates) {
      try {
        let res: any;
        let json: TripayResponse;
        if (url.startsWith("/api/")) {
          // Gunakan axios api untuk proxy Next agar Authorization ikut
          res = await api.get(url);
          json = (res.data || {}) as TripayResponse;
          if (
            res.status >= 200 &&
            res.status < 300 &&
            (json?.success ?? true)
          ) {
            return json;
          }
          lastErr = new Error(json?.message || `Fetch error (${res.status})`);
        } else {
          // Panggil backend langsung via axiosInstance (Authorization dari NextAuth)
          res = await axiosInstance.get(url);
          json = (res.data || {}) as TripayResponse;
          if (
            res.status >= 200 &&
            res.status < 300 &&
            (json?.success ?? true)
          ) {
            return json;
          }
          lastErr = new Error(json?.message || `Fetch error (${res.status})`);
        }
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Tidak dapat mengambil status pembayaran");
  };

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const json = await tryFetch();
      setData(json.data);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Gagal membaca status pembayaran");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000); // polling 3 detik
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Resolve orderId backend bila param adalah merchant_ref lama (INV-...)
  useEffect(() => {
    if (String(orderId || "").startsWith("INV-")) {
      try {
        const saved = sessionStorage.getItem("checkout:orderId");
        if (saved) {
          let actualId = saved;
          if (/^\s*".*"\s*$/.test(saved)) {
            const parsed = JSON.parse(saved);
            actualId = typeof parsed === "string" ? parsed : String(parsed);
          }
          if (actualId && actualId !== "null" && actualId !== "undefined") {
            setEffectiveId(actualId);
            return;
          }
        }
      } catch {}
    }
    setEffectiveId(orderId);
  }, [orderId]);

  const status = useMemo(() => {
    const s = String(data?.status || "").toUpperCase() as TripayStatus | "";
    return s || undefined;
  }, [data]);

  const isSuccess = useMemo(
    () => (status ? ["PAID", "SUCCESS", "COMPLETED"].includes(status) : false),
    [status]
  );
  const isFailed = useMemo(
    () =>
      status ? ["FAILED", "EXPIRED", "CANCELLED"].includes(status) : false,
    [status]
  );
  const isPending = useMemo(
    () => (status ? ["PENDING", "PROCESSING"].includes(status) : false),
    [status]
  );

  // Batalkan order di backend jika kadaluarsa
  useEffect(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const expired = data?.expired_time
      ? nowSec >= Number(data.expired_time)
      : false;
    const statusUpper = String(data?.status || "").toUpperCase();
    if (!hasCancelled && (statusUpper === "EXPIRED" || expired)) {
      (async () => {
        try {
          await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "CANCELLED" }),
          });
        } catch {}
        setHasCancelled(true);
      })();
    }
  }, [data?.status, data?.expired_time, hasCancelled, orderId]);

  const amountText = useMemo(() => {
    const amt = data?.amount ?? null;
    return typeof amt === "number" ? `Rp ${amt.toLocaleString("id-ID")}` : "-";
  }, [data]);

  const expiryText = useMemo(() => {
    const exp = data?.expired_time ?? null;
    return typeof exp === "number"
      ? new Date(exp * 1000).toLocaleString("id-ID")
      : null;
  }, [data]);

  return (
    <div className="relative w-full max-w-screen-md mx-auto px-4 py-8">
      <h2 className="text-2xl font-semibold text-center">Payment Result</h2>
      <p className="text-sm text-muted-foreground text-center mt-1">
        Order ID: {effectiveId}
      </p>
      <Separator className="my-6" />

      {loading && (
        <p className="text-center text-sm text-muted-foreground">
          Memuat status pembayaran…
        </p>
      )}
      {error && <p className="text-center text-sm text-red-600">{error}</p>}

      {/* Ringkasan */}
      {!error && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          <div className="flex items-center justify-between border rounded-md p-3">
            <span className="text-sm text-[#6C6C6C]">Nominal</span>
            <span className="font-semibold">{amountText}</span>
          </div>
          <div className="flex items-center justify-between border rounded-md p-3">
            <span className="text-sm text-[#6C6C6C]">Metode</span>
            <span className="font-semibold">{data?.method || "-"}</span>
          </div>
          <div className="flex items-center justify-between border rounded-md p-3">
            <span className="text-sm text-[#6C6C6C]">Batas Waktu</span>
            <span className="font-semibold">{expiryText || "-"}</span>
          </div>
          <div className="flex items-center justify-between border rounded-md p-3">
            <span className="text-sm text-[#6C6C6C]">Status</span>
            <span className="font-semibold">
              {status || (loading ? "Loading" : "-")}
            </span>
          </div>
        </section>
      )}

      {isSuccess && (
        <section className="text-center py-10">
          <div className="flex justify-center mb-6">
            <img
              src="/Ilustrasi.png"
              alt="Payment Success Illustration"
              className="w-[300px] h-auto"
            />
          </div>
          <div className="mx-auto w-64 h-[2px] bg-muted mb-4" />
          <h3 className="text-base md:text-lg font-semibold">
            Yeayyy!, Payment Successful
          </h3>
          <p className="mt-2 text-xs text-muted-foreground">
            Order: {data?.merchant_ref} • Amount: {amountText}
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Button
              asChild
              className="bg-[#E7A9A9] hover:bg-[#e19191] text-white px-5"
            >
              <Link href="/history">Lihat Riwayat Pesanan</Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="bg-[#E7A9A9] hover:bg-[#e19191] text-white px-5"
            >
              <Link href={`/orders/${encodeURIComponent(effectiveId)}/invoice`}>
                Download Invoice
              </Link>
            </Button>
          </div>
        </section>
      )}

      {isFailed && (
        <section className="space-y-4 text-center py-12 border rounded-md">
          <div className="text-5xl">❌</div>
          <h3 className="text-xl font-semibold">Payment Failed</h3>
          <p className="text-sm text-muted-foreground">Status: {status}</p>
          <div className="flex items-center justify-center gap-3">
            <Button asChild>
              <Link href={`/payment?order=${encodeURIComponent(orderId)}`}>
                Coba Lagi
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/">Back To Home</Link>
            </Button>
          </div>
        </section>
      )}

      {isPending && (
        <section className="space-y-4 text-center py-12 border rounded-md">
          <div className="text-5xl">⏳</div>
          <h3 className="text-xl font-semibold">Menunggu Pembayaran…</h3>
          <p className="text-sm text-muted-foreground">
            Order: {data?.merchant_ref} • Method: {data?.method || "-"}
          </p>
          {expiryText && (
            <p className="text-sm text-muted-foreground">
              Berakhir: {expiryText}
            </p>
          )}
          <div className="flex items-center justify-center gap-3">
            <Button asChild>
              <Link href="/">Back To Home</Link>
            </Button>
          </div>
        </section>
      )}

      {!loading && !error && !status && (
        <p className="text-center text-sm text-muted-foreground">
          Status tidak tersedia.
        </p>
      )}
    </div>
  );
}
