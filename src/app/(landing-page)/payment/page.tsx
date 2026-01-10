"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Clock, Copy, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import ProgressStepper from "@/components/ui/progress-stepper";
import UnauthorizePage from "@/components/pages/unauthorize";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { formatRupiah } from "@/helper/format-rupiah";
import PaymentMethod from "@/features/payments/tripay/payment-method";
import { UseGetCart } from "@/features/cart/api/use-get-cart";
import api from "@/lib/api";

function PaymentContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Ambil data keranjang untuk nominal
  const { data: cartData = [], isLoading } = UseGetCart();

  // Discount (restore dari sessionStorage)
  const [discount, setDiscount] = useState<{
    code: string;
    value: number;
    type: "PERCENTAGE" | "FIXED_AMOUNT";
  } | null>(null);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("checkout:discount");
      if (saved) {
        const obj = JSON.parse(saved);
        if (obj?.code && typeof obj?.value === "number" && obj?.type) {
          setDiscount({ code: obj.code, value: obj.value, type: obj.type });
        }
      }
    } catch {}
  }, []);

  // Ambil total awal dari sessionStorage sebagai nilai awal (hindari flicker nominal)
  const [initialTotal, setInitialTotal] = useState<number | null>(() => {
    try {
      const t =
        typeof window !== "undefined"
          ? sessionStorage.getItem("checkout:totalAfterDiscount")
          : null;
      if (t) {
        const num = Number(JSON.parse(t));
        if (!Number.isNaN(num) && num >= 0) return num;
      }
    } catch {}
    return null;
  });

  // Detail pengambilan dari Checkout
  const [pickupDateIso, setPickupDateIso] = useState<string | null>(null);
  const [pickupTime, setPickupTime] = useState<string>("");
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("checkout:details");
      if (raw) {
        const obj = JSON.parse(raw);
        setPickupDateIso(obj?.pickupDate ?? null);
        setPickupTime(obj?.pickupTime ?? "");
      }
    } catch {}
  }, []);

  // Hitung subtotal dan total
  const subtotal = useMemo(
    () =>
      Array.isArray(cartData)
        ? cartData.reduce((tot, it) => tot + it.price * it.quantity, 0)
        : 0,
    [cartData]
  );
  const shippingFee = 0;
  const discountAmount = useMemo(() => {
    if (!discount) return 0;
    if (discount.type === "PERCENTAGE")
      return Math.floor(
        (subtotal * Math.min(Math.max(discount.value, 0), 100)) / 100
      );
    return Math.max(Math.min(discount.value, subtotal), 0);
  }, [discount, subtotal]);
  const totalAfterDiscount = Math.max(
    subtotal + shippingFee - discountAmount,
    0
  );

  // Simpan total awal dari Checkout, jangan mengosongkan keranjang di sini
  useEffect(() => {
    if (
      initialTotal === null &&
      Array.isArray(cartData) &&
      cartData.length > 0
    ) {
      setInitialTotal(totalAfterDiscount);
    }
  }, [cartData, initialTotal, totalAfterDiscount]);

  // State transaksi
  const [creating, setCreating] = useState(false);
  const [transactionData, setTransactionData] = useState<any | null>(null);
  const [merchantRef, setMerchantRef] = useState<string | null>(null);
  const [backendOrder, setBackendOrder] = useState<any | null>(null);
  const [tripayReference, setTripayReference] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [hasRedirected, setHasRedirected] = useState<boolean>(false);
  const [lastETag, setLastETag] = useState<string | null>(null);
  const [etagKey, setEtagKey] = useState<string | null>(null);
  const [hasCancelled, setHasCancelled] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [hasSynced, setHasSynced] = useState(false);
  const [hasFetchAttempted, setHasFetchAttempted] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false); // New state for loading indicator
  const [isMethodSelectionVisible, setIsMethodSelectionVisible] = useState(
    () => {
      if (typeof window !== "undefined") {
        const p = new URLSearchParams(window.location.search);
        // Jika ada param 'order', anggap kita sedang memuat transaksi yang sudah ada (sembunyikan seleksi dulu)
        if (p.get("order")) return false;
      }
      return true;
    }
  );
  const POLL_INTERVAL_MS = 5000;

  // Ringkasan jadwal pengambilan (Asia/Jakarta)
  const pickupSummary = useMemo(() => {
    let d: Date | null = null;
    try {
      if (pickupDateIso) {
        d = new Date(pickupDateIso);
        if (pickupTime) {
          const [hStr, mStr] = String(pickupTime).split(":");
          const h = Number(hStr);
          const m = Number(mStr);
          if (!Number.isNaN(h) && !Number.isNaN(m)) d.setHours(h, m, 0, 0);
        }
      } else if (backendOrder?.pickupAt) {
        d = new Date(backendOrder.pickupAt);
      }
      if (!d) return null;
      const fmt = new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      return fmt.format(d);
    } catch {
      return null;
    }
  }, [pickupDateIso, pickupTime, backendOrder?.pickupAt]);

  const shouldStopPolling = (status?: string) =>
    ["PAID", "EXPIRED", "FAILED"].includes(String(status || "").toUpperCase());

  // Format batas pembayaran lokal (Asia/Jakarta) dari expired_time/expired_at
  const expiresLocal = useMemo(() => {
    try {
      let d: Date | null = null;
      const expSec = Number(transactionData?.expired_time);
      if (expSec && !Number.isNaN(expSec)) {
        d = new Date(expSec * 1000);
      } else if (transactionData?.expired_at) {
        const ea = transactionData.expired_at;
        if (typeof ea === "number") d = new Date(ea * 1000);
        else if (typeof ea === "string") d = new Date(ea);
      }
      if (!d) return null;
      const fmt = new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      return fmt.format(d);
    } catch {
      return null;
    }
  }, [transactionData?.expired_time, transactionData?.expired_at]);

  useEffect(() => {
    // Jika datang dari riwayat dengan query ?order=..., ambil detail order dari backend
    const orderParam = searchParams.get("order");
    if (!orderParam) return;
    setMerchantRef(orderParam);
    (async () => {
      try {
        const res = await fetch(
          `/api/orders/${encodeURIComponent(orderParam)}`,
          {
            cache: "no-store",
          }
        );
        const js = await res.json().catch(() => ({}));
        if (res.ok && (js?.data || js)) {
          const d = js?.data ?? js;
          setBackendOrder(d);

          // Jika order memiliki tripayReference, gunakan itu untuk fetch status transaksi
          // Ini mengatasi masalah jika fetch by merchantRef (UUID) gagal di backend
          if (d?.tripayReference) {
            setTripayReference(d.tripayReference);
            // Paksa sembunyikan pemilihan metode pembayaran jika kita sudah punya referensi transaksi
            setIsMethodSelectionVisible(false);
          } else {
            // Coba restore dari sessionStorage jika backend belum punya
            try {
              const savedRef = sessionStorage.getItem(
                `tripay_ref_${orderParam}`
              );
              if (savedRef) {
                setTripayReference(savedRef);
                setIsMethodSelectionVisible(false);
              }
            } catch {}
          }

          // Simpan juga ke sessionStorage agar handleContinue dapat menemukan merchant_ref
          try {
            sessionStorage.setItem("checkout:orderId", String(orderParam));
          } catch {}
        }
      } catch {}
    })();
  }, [searchParams]);

  // Baca optional reference dari URL (misal redirect balik dari halaman pembayaran)
  useEffect(() => {
    const ref = searchParams.get("reference");
    if (ref) setTripayReference(ref);
  }, [searchParams]);

  const fetchStatus = React.useCallback(
    async (silent = false) => {
      setStatusError(null);
      // Gunakan reference Tripay bila tersedia; jika tidak, gunakan merchantRef via query agar backend dapat resolve
      const keyRef = tripayReference ? String(tripayReference) : null;
      const keyMerchant = !keyRef && merchantRef ? String(merchantRef) : null;
      if (!keyRef && !keyMerchant) return;
      try {
        if (!silent) setIsRefreshing(true);
        const headers: Record<string, string> = {};
        const etagIdentity = keyRef ? `ref:${keyRef}` : `mref:${keyMerchant}`;
        if (lastETag && etagKey === etagIdentity)
          headers["If-None-Match"] = lastETag;
        let res: any;
        // Gunakan path-based fetching agar ditangani oleh [id]/route.ts dan backend controller
        // Backend controller sudah cerdas mendeteksi apakah path adalah UUID (merchantRef) atau Reference Tripay
        if (keyRef) {
          res = await api.get(
            `/api/payments/tripay/transaction/${encodeURIComponent(keyRef)}`,
            { headers }
          );
        } else if (keyMerchant) {
          res = await api.get(
            `/api/payments/tripay/transaction/${encodeURIComponent(
              keyMerchant
            )}`,
            { headers }
          );
        }
        if (res.status === 304) {
          setLastUpdatedAt(Date.now());
          return;
        }
        const json = res.data || {};
        if (res.status < 200 || res.status >= 300 || !json?.data)
          throw new Error(
            json?.message || `Gagal memuat status (HTTP ${res.status})`
          );
        const d = json.data;
        setTransactionData((prev: any) => (prev ? { ...prev, ...d } : d));
        setLastUpdatedAt(Date.now());
        const etag = res.headers?.["etag"] || res.headers?.ETag || "";
        if (etag) {
          setLastETag(etag);
          setEtagKey(etagIdentity);
        }
        // Jika backend mengembalikan reference Tripay, simpan untuk konsistensi polling berikutnya
        if (d?.reference && !tripayReference) {
          setTripayReference(String(d.reference));
        }
        if (d?.expired_time) {
          const expMs = Number(d.expired_time) * 1000;
          setRemainingMs(Math.max(expMs - Date.now(), 0));
        } else if (d?.expired_at) {
          const ea = d.expired_at;
          const expMs =
            typeof ea === "number" ? ea * 1000 : new Date(String(ea)).getTime();
          if (expMs) setRemainingMs(Math.max(expMs - Date.now(), 0));
        }
        if (shouldStopPolling(d?.status)) setAutoRefresh(false);

        // Auto-hide method selection if transaction is active (UNPAID/PENDING)
        // BUT: If it's a local fallback (backend lost connection to Tripay or Tripay data gone),
        // we must keep the selection visible so user can create a new transaction.
        const statusUpper = String(d?.status || "").toUpperCase();
        if (
          (statusUpper === "UNPAID" || statusUpper === "PENDING") &&
          !d?.is_local_fallback
        ) {
          setIsMethodSelectionVisible(false);
        } else if (
          !d?.status ||
          statusUpper === "FAILED" ||
          statusUpper === "EXPIRED" ||
          statusUpper === "CANCELLED"
        ) {
          // Jika status terminal atau tidak valid, tampilkan pilihan metode agar user bisa buat baru
          // TAPI: Jika ini adalah 'CANCELLED' tapi kita baru saja memuat, pastikan bukan karena kesalahan sesaat.
          // Cek apakah masih dalam periode valid (expiry belum lewat).
          let hasTime = false;
          if (d?.expired_time) {
            const exp = Number(d.expired_time) * 1000;
            if (exp > Date.now()) hasTime = true;
          } else if (d?.expired_at) {
            const ea = d.expired_at;
            const expMs =
              typeof ea === "number"
                ? ea * 1000
                : new Date(String(ea)).getTime();
            if (expMs > Date.now()) hasTime = true;
          }

          if (statusUpper === "CANCELLED" && hasTime) {
            // Jika status CANCELLED tapi waktu masih ada, jangan langsung timpa dengan form pembayaran.
            // Biarkan user melihat detail transaksi (mungkin backend salah update atau delay sync).
            console.warn(
              "[Payment] Status CANCELLED but time remains. Keeping details visible."
            );
            setIsMethodSelectionVisible(false);
          } else {
            setIsMethodSelectionVisible(true);
          }
        }
      } catch (e: any) {
        let message = e?.response?.data?.message || e?.message || String(e);
        if (typeof message === "object") {
          message = message.message || JSON.stringify(message);
        }
        // Ignore 404 (Not Found) as it simply means transaction hasn't been created yet
        if (e?.response?.status === 404 || /404/.test(message)) {
          setStatusError(null);
          setAutoRefresh(false);

          // CRITICAL FIX: Only show method selection if we really don't have a known Tripay reference
          // If backendOrder says we have a reference, but Tripay returns 404, it might be a temporary sync issue.
          // Don't force user to pay again if we know a reference exists.
          if (tripayReference) {
            console.warn(
              "[Payment] 404 from Tripay but tripayReference exists. Retrying or waiting..."
            );
            // Optionally set an error message but keep method selection hidden
            setStatusError("Sedang memuat detail transaksi...");
          } else {
            // Jika 404 dan tidak ada reference, berarti belum ada transaksi di Tripay -> tampilkan pilihan metode
            setIsMethodSelectionVisible(true);
          }
        } else {
          setStatusError(message);
          if (!silent) {
            toast({
              title: "Gagal memuat status",
              description: message,
              variant: "destructive",
            });
          }
        }
      } finally {
        if (!silent) setIsRefreshing(false);
        setHasFetchAttempted(true);
      }
    },
    [
      tripayReference,
      merchantRef,
      lastETag,
      etagKey,
      toast,
      // eslint-disable-next-line react-hooks/exhaustive-deps
    ]
  );

  // Auto-restore status transaksi jika merchantRef sudah ada
  useEffect(() => {
    if (merchantRef && !transactionData) {
      fetchStatus(true);
    }
  }, [merchantRef, transactionData, fetchStatus]);

  // FIX: Auto-hide payment method selection if transaction data is loaded
  useEffect(() => {
    if (transactionData && transactionData.status) {
      const s = String(transactionData.status).toUpperCase();
      // Only hide if it's NOT a local fallback (meaning we have real Tripay data)
      if (
        ["UNPAID", "PENDING", "PAID", "SUCCESS", "PROCESSING"].includes(s) &&
        !transactionData.is_local_fallback
      ) {
        setIsMethodSelectionVisible(false);
      }
    }
  }, [transactionData]);

  // Auto-sync status order di backend jika Tripay sudah UNPAID tapi order mungkin belum PENDING
  useEffect(() => {
    if (
      !merchantRef ||
      !transactionData ||
      hasSynced ||
      !["UNPAID", "PENDING"].includes(
        String(transactionData.status).toUpperCase()
      )
    ) {
      return;
    }

    // Lakukan sync sekali saja per load halaman
    setHasSynced(true);

    // Kirim PATCH status=pending
    api
      .patch(`/api/orders/${encodeURIComponent(merchantRef)}`, {
        status: "pending",
      })
      .catch(() => {});
  }, [merchantRef, transactionData, hasSynced]);

  // Countdown aktif untuk status non-terminal (bukan PAID/EXPIRED/FAILED) ketika expiry tersedia
  useEffect(() => {
    const status = String(transactionData?.status || "").toUpperCase();
    const hasExpiry = Boolean(
      transactionData?.expired_time ?? transactionData?.expired_at
    );
    if (shouldStopPolling(status) || !hasExpiry) return;
    const tick = () => {
      const now = Date.now();
      let expMs: number | null = null;
      if (typeof transactionData?.expired_time === "number") {
        expMs = Number(transactionData.expired_time) * 1000;
      } else if (transactionData?.expired_at) {
        const ea = transactionData.expired_at;
        expMs =
          typeof ea === "number" ? ea * 1000 : new Date(String(ea)).getTime();
      }
      if (!expMs) return;
      setRemainingMs(Math.max(expMs - now, 0));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [
    transactionData?.expired_time,
    transactionData?.expired_at,
    transactionData?.status,
  ]);

  function formatCountdown(ms: number) {
    const s = Math.floor(ms / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  async function handleContinue(selectedCode: string) {
    try {
      setCreating(true);

      // --- VALIDASI STATE TRANSAKSI ---
      const currentStatus = String(transactionData?.status || "").toUpperCase();
      const isUnpaid = ["UNPAID", "PENDING"].includes(currentStatus);

      // Logic: Apakah kita harus mencegah user membuat transaksi baru?
      // Kita cegah jika user memilih metode yang SAMA dengan transaksi yang sedang AKTIF (UNPAID/PENDING).
      const shouldResumeExisting = (() => {
        if (!isUnpaid) return false;
        if (transactionData?.is_local_fallback) return false; // Fallback lokal boleh ditimpa (dianggap error/incomplete)

        const currentMethod = String(
          transactionData?.method || transactionData?.payment_method || ""
        ).toUpperCase();
        const selected = String(selectedCode || "").toUpperCase();

        // Heuristik: Metode dianggap sama jika stringnya mirip (misal "BNIVA" vs "BNI Virtual Account")
        const isSameMethod =
          currentMethod === selected ||
          (currentMethod && selected && currentMethod.includes(selected));

        if (!isSameMethod) return false;

        // Cek apakah transaksi valid (punya instruksi pembayaran)
        const hasInstructions =
          (Array.isArray(transactionData?.instructions) &&
            transactionData.instructions.length > 0) ||
          transactionData?.qr_url ||
          transactionData?.qr_string ||
          transactionData?.pay_code ||
          transactionData?.va_number ||
          transactionData?.payment_url ||
          transactionData?.checkout_url;

        // Cek sisa waktu
        const hasTimeRemaining =
          !transactionData?.expired_time || remainingMs > 0;

        return hasInstructions && hasTimeRemaining;
      })();

      if (shouldResumeExisting) {
        toast({
          title: "Transaksi Sudah Aktif",
          description:
            "Silakan lanjutkan pembayaran menggunakan instruksi yang sudah tersedia.",
        });
        setCreating(false);
        return;
      }

      const hasExpiry = Boolean(
        transactionData?.expired_time ?? transactionData?.expired_at
      );

      if (currentStatus === "EXPIRED" || (hasExpiry && remainingMs <= 0)) {
        toast({
          title: "Transaksi kadaluarsa",
          description:
            "Waktu bayar telah habis (60 menit). Silakan buat pesanan baru.",
          variant: "destructive",
        });
        setCreating(false);
        return;
      }
      // Wajib: merchant_ref harus orderId backend dari Checkout
      let newMerchantRef: string | null = null;
      try {
        // Prioritaskan query param ?order=...
        const orderParam = searchParams.get("order");
        const savedIdRaw =
          orderParam || sessionStorage.getItem("checkout:orderId");
        if (savedIdRaw) {
          // Jangan parse JSON untuk string non-numeric seperti UUID/INV; gunakan raw
          let strId = savedIdRaw;
          // Jika tersimpan sebagai JSON string (mis. "12345"), aman untuk parse
          if (/^\s*".*"\s*$/.test(savedIdRaw)) {
            const parsed = JSON.parse(savedIdRaw);
            strId = typeof parsed === "string" ? parsed : String(parsed);
          }
          if (strId && strId !== "null" && strId !== "undefined") {
            newMerchantRef = strId;
          }
        }
      } catch {}
      if (!newMerchantRef) {
        toast({
          title: "Order belum dibuat",
          description:
            "Silakan kembali ke halaman Checkout untuk membuat Order terlebih dahulu.",
          variant: "destructive",
        });
        setCreating(false);
        return;
      }
      // Bangun order_items: gunakan detail order backend bila tersedia; fallback ke keranjang
      let baseItems: any[] = [];
      if (backendOrder && Array.isArray(backendOrder?.products)) {
        baseItems = backendOrder.products.map((p: any) => ({
          id: p?.product_id ?? p?.id,
          product_id: p?.product_id ?? p?.id,
          productId: p?.product_id ?? p?.id,
          name: p?.name,
          price: Math.round(p?.price ?? 0),
          quantity: Math.round(p?.quantity ?? 1),
        }));
      } else {
        if (!Array.isArray(cartData) || cartData.length === 0) {
          toast({
            title: "Data transaksi belum tersedia",
            description:
              "Order tidak memiliki rincian produk dan keranjang kosong. Kembali ke Checkout.",
            variant: "destructive",
          });
          setCreating(false);
          return;
        }
        baseItems = cartData.map((i: any) => {
          const productId = i?.product?.id ?? i?.product_id ?? i?.productId;
          const name = i?.product?.name ?? i?.name;
          const price = Math.round(i?.product?.price ?? i?.price);
          const quantity = Math.round(i?.quantity ?? 1);
          return {
            id: productId,
            product_id: productId,
            productId,
            name,
            price,
            quantity,
          };
        });
      }
      // Validasi: semua item harus memiliki productId
      const missingProductId = baseItems.some((it) => !it.productId);
      if (missingProductId) {
        toast({
          title: "Data produk tidak lengkap",
          description:
            "Sebagian item keranjang tidak memuat 'product_id'. Silakan muat ulang atau kembali ke halaman Produk.",
          variant: "destructive",
        });
        setCreating(false);
        return;
      }
      // Tambahkan diskon sebagai item non-produk (tanpa productId)
      if (discount && discountAmount > 0) {
        baseItems.push({
          name: `Diskon (${discount.code})`,
          price: -Math.round(discountAmount),
          quantity: 1,
        });
      }
      // Jangan kirim item pickup sama sekali; kirim detail via notes saja
      // amount harus sama dengan Σ price * quantity dari order_items
      const computedAmount = baseItems.reduce(
        (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0),
        0
      );
      const finalAmount = Math.max(Math.round(computedAmount), 0);
      if (computedAmount !== finalAmount) {
        toast({
          title: "Perhatian",
          description: `Total item (${formatRupiah(
            computedAmount
          )}) tidak sama dengan amount (${formatRupiah(
            finalAmount
          )}). Silakan cek kembali.`,
          variant: "destructive",
        });
        setCreating(false);
        return;
      }
      // Bentuk ISO datetime pickupAt dari pickupDateIso + pickupTime
      const pickupAt = (() => {
        try {
          if (!pickupDateIso || !pickupTime) return "";
          const [hStr, mStr] = String(pickupTime).split(":");
          const h = Number(hStr);
          const m = Number(mStr);
          const d = new Date(pickupDateIso);
          if (!Number.isNaN(h) && !Number.isNaN(m)) {
            d.setHours(h, m, 0, 0);
          }
          return d.toISOString();
        } catch {
          return "";
        }
      })();
      // Bangun representasi lokal (YYYY-MM-DD dan HH:mm) agar backend tidak salah tafsir UTC
      const pickupLocal = (() => {
        try {
          if (!pickupDateIso || !pickupTime) return null;
          const [hStr, mStr] = String(pickupTime).split(":");
          const d = new Date(pickupDateIso);
          const yyyy = String(d.getFullYear());
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          const hh = String(Number(hStr)).padStart(2, "0");
          const mi = String(Number(mStr)).padStart(2, "0");
          return {
            date: `${yyyy}-${mm}-${dd}`,
            time: `${hh}:${mi}`,
            localIso: `${yyyy}-${mm}-${dd}T${hh}:${mi}`,
          };
        } catch {
          return null;
        }
      })();

      // Sinkronkan Order di backend lebih dulu dengan jadwal terbaru
      try {
        if (newMerchantRef && (pickupAt || pickupLocal)) {
          const tz =
            typeof Intl !== "undefined"
              ? Intl.DateTimeFormat().resolvedOptions().timeZone ||
                "Asia/Jakarta"
              : "Asia/Jakarta";
          await api
            .patch(`/api/orders/${encodeURIComponent(newMerchantRef)}`, {
              ...(pickupAt ? { pickupAt } : {}),
              ...(pickupLocal
                ? {
                    pickupAtLocal: pickupLocal.localIso,
                    pickupTimezone: tz,
                    pickup_date: pickupLocal.date,
                    pickup_time: pickupLocal.time,
                  }
                : {}),
            })
            .catch(() => {});
        }
      } catch {}

      const body = {
        method: selectedCode,
        merchant_ref: newMerchantRef,
        amount: finalAmount,
        customer_name: session?.user?.name ?? "Customer",
        customer_email: session?.user?.email ?? "",
        customer_phone: "",
        order_items: baseItems,
        return_url: `${
          typeof window !== "undefined" ? window.location.origin : ""
        }/payment${
          newMerchantRef ? `?order=${encodeURIComponent(newMerchantRef)}` : ""
        }`,
        // Setel masa berlaku transaksi. UBAH DI SINI untuk mengatur durasi expired (dalam detik).
        // Saat ini diset 1 jam (3600 detik).
        expired_time: Math.floor(Date.now() / 1000) + 3600,
        discountCode: discount?.code,
        ...(pickupAt ? { pickupAt } : {}),
        ...(pickupLocal
          ? {
              pickupAtLocal: pickupLocal.localIso,
              pickupTimezone:
                typeof Intl !== "undefined"
                  ? Intl.DateTimeFormat().resolvedOptions().timeZone ||
                    "Asia/Jakarta"
                  : "Asia/Jakarta",
              pickup_date: pickupLocal.date,
              pickup_time: pickupLocal.time,
            }
          : {}),
        notes: pickupDateIso
          ? `Pengambilan di toko pada ${new Date(
              pickupDateIso
            ).toLocaleDateString()} ${pickupTime || ""}`
          : undefined,
      };

      const postOnce = async () => {
        const res = await api.post(`/api/payments/tripay/transaction`, body);
        const js = res.data;
        return { res, js };
      };
      let { res: resp, js: json } = await postOnce();
      if (
        (resp.status < 200 || resp.status >= 300) &&
        [403, 502].includes(resp.status)
      ) {
        await new Promise((r) => setTimeout(r, 1200));
        ({ res: resp, js: json } = await postOnce());
      }
      if (resp.status < 200 || resp.status >= 300 || !json?.success)
        throw new Error(
          json?.message || `Tripay create failed (status ${resp.status})`
        );

      const data = json.data;
      setTransactionData(data);
      setMerchantRef(newMerchantRef);
      // Persist jadwal ambil ke Order di backend (PATCH) agar dashboard menampilkan Waktu Ambil
      // Sekalian update status ke 'pending' agar muncul di riwayat (jika backend belum update)
      try {
        if (newMerchantRef) {
          const patchBody: any = { status: "pending" };
          if (pickupAt) patchBody.pickupAt = pickupAt;

          await api
            .patch(
              `/api/orders/${encodeURIComponent(newMerchantRef)}`,
              patchBody
            )
            .catch(() => {});
        }
      } catch {}
      // Simpan Tripay reference untuk polling status agar tidak 404
      if (data?.reference) {
        setTripayReference(String(data.reference));
      }
      setLastUpdatedAt(Date.now());
      try {
        sessionStorage.setItem(
          `tripay:instructions:${newMerchantRef}`,
          JSON.stringify(data)
        );
      } catch {}
      if (!shouldStopPolling(data?.status)) setAutoRefresh(true);
    } catch (e: any) {
      console.error("[PaymentPage] Transaction Create Error:", e);
      let desc = e?.response?.data?.message || e?.message || String(e);
      if (
        (desc === "Request failed with status code 400" ||
          desc === "Request failed with status code 500") &&
        e?.response?.data
      ) {
        desc =
          typeof e.response.data === "string"
            ? e.response.data
            : JSON.stringify(e.response.data);
      }
      if (/Insufficient\s+stock/i.test(desc)) {
        const m = desc.match(
          /Insufficient stock for product\s+([^\.]+)\.\s*Available:\s*(\d+),\s*Requested:\s*(\d+)/i
        );
        if (m) {
          desc = `Stok tidak cukup untuk produk ${m[1]}. Tersedia: ${m[2]}, diminta: ${m[3]}. Kurangi jumlah di keranjang atau perbarui stok produk.`;
        } else {
          desc =
            "Stok produk tidak mencukupi. Kurangi jumlah di keranjang atau perbarui stok produk.";
        }
      }
      toast({ title: "Gagal", description: desc, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    const key = tripayReference || merchantRef;
    if (
      !key ||
      !transactionData ||
      !autoRefresh ||
      shouldStopPolling(transactionData?.status)
    )
      return;
    const id = setInterval(() => {
      fetchStatus(true);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [tripayReference, merchantRef, transactionData, autoRefresh, fetchStatus]);

  // Auto-redirect ke halaman Payment Result ketika pembayaran sukses
  useEffect(() => {
    const status = String(transactionData?.status || "").toUpperCase();
    if (hasRedirected) return;
    if (["PAID", "SUCCESS", "COMPLETED"].includes(status)) {
      setAutoRefresh(false);
      setHasRedirected(true);
      const url =
        `/orders/${encodeURIComponent(
          merchantRef || ""
        )}/payment?merchantRef=${encodeURIComponent(merchantRef || "")}` +
        (tripayReference
          ? `&reference=${encodeURIComponent(tripayReference)}`
          : "");
      router.push(url);
    }
  }, [
    transactionData?.status,
    merchantRef,
    tripayReference,
    hasRedirected,
    router,
  ]);

  // Otomatis batalkan Order ketika waktu habis atau status EXPIRED
  // Catatan: pastikan expiry tersedia agar tidak membatalkan saat nilai awal countdown masih 0.
  // LOGIKA PEMBATALAN OTOMATIS DI FRONTEND DINONAKTIFKAN
  // untuk mencegah pembatalan prematur saat user menutup tab/browser.
  /*
  useEffect(() => {
    // Disabled to prevent premature cancellation
  }, []);
  */

  // Display Logic: Override status if premature cancellation detected
  const displayStatus = useMemo(() => {
    const raw = String(transactionData?.status || "").toUpperCase();
    // Jika status CANCELLED tapi waktu masih ada dan kita punya referensi Tripay,
    // kemungkinan ini adalah pembatalan prematur oleh backend (auto-cancel).
    // Kita override tampilan menjadi PENDING agar user tidak bingung.
    if (
      raw === "CANCELLED" &&
      remainingMs > 0 &&
      (tripayReference || transactionData?.reference)
    ) {
      return "PENDING";
    }
    return raw;
  }, [
    transactionData?.status,
    remainingMs,
    tripayReference,
    transactionData?.reference,
  ]);

  if (!session) return <UnauthorizePage />;

  if (
    isLoading ||
    (merchantRef &&
      !transactionData &&
      !hasFetchAttempted &&
      !isMethodSelectionVisible)
  ) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p>Memuat data transaksi...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Loading Overlay saat refresh manual/auto */}
      {isCheckingStatus && !transactionData && (
        <div className="fixed inset-0 bg-white/50 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow">
            Memeriksa status pembayaran...
          </div>
        </div>
      )}
      <ProgressStepper currentStep={3} className="mb-2" />

      {isMethodSelectionVisible ? (
        <Card className="h-fit shadow-md border-border">
          <CardHeader className="pb-3 bg-muted/30">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="bg-primary/10 p-1.5 rounded-full">
                <RefreshCw className="w-4 h-4 text-primary" />
              </div>
              Pilih Metode Pembayaran
            </CardTitle>
            <CardDescription>
              Pilih metode pembayaran yang Anda inginkan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground space-y-2">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <p className="text-sm">Memuat data keranjang...</p>
              </div>
            ) : (
              <>
                <div className="bg-secondary/20 p-4 rounded-lg border border-border/50 flex flex-col sm:flex-row justify-between items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Total Pembayaran
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {formatRupiah(
                      initialTotal !== null ? initialTotal : totalAfterDiscount
                    )}
                  </span>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium">Metode Tersedia:</p>
                  <PaymentMethod
                    totalPrice={
                      initialTotal !== null ? initialTotal : totalAfterDiscount
                    }
                    onContinue={handleContinue}
                  />
                </div>

                {creating && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2 bg-muted/30 rounded">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Membuat transaksi...
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full shadow-md border-border overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Status Pembayaran</CardTitle>
                <CardDescription className="mt-1">
                  Pantau status pesanan dan selesaikan pembayaran Anda.
                </CardDescription>
              </div>
              {transactionData && (
                <Badge
                  variant={
                    displayStatus === "PAID" || displayStatus === "SUCCESS"
                      ? "default"
                      : displayStatus === "EXPIRED" ||
                        displayStatus === "FAILED"
                      ? "destructive"
                      : "secondary"
                  }
                  className={`px-3 py-1 text-sm ${
                    displayStatus === "PAID" || displayStatus === "SUCCESS"
                      ? "bg-green-600 hover:bg-green-700"
                      : displayStatus === "UNPAID" ||
                        displayStatus === "PENDING"
                      ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                      : ""
                  }`}
                >
                  {displayStatus}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {!transactionData ? (
              statusError && merchantRef ? (
                <div className="text-center py-8 space-y-4">
                  <XCircle className="w-12 h-12 text-red-500 mx-auto" />
                  <div className="space-y-2">
                    <p className="font-medium text-red-600">
                      Gagal memuat status
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {statusError}
                    </p>
                  </div>
                  <Button onClick={() => fetchStatus(false)} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" /> Coba Lagi
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {merchantRef && !hasFetchAttempted ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                      <p>Memuat detail transaksi...</p>
                    </div>
                  ) : (
                    <p>
                      Belum ada transaksi aktif. Silakan pilih metode pembayaran
                      di atas.
                    </p>
                  )}
                </div>
              )
            ) : (
              <>
                {/* Top Summary Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/20 p-4 rounded-lg border border-border/50">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Total Tagihan
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      {formatRupiah(Number(transactionData?.amount ?? 0))}
                    </p>
                  </div>
                  <div className="flex flex-col md:items-end justify-center">
                    {!shouldStopPolling(displayStatus) &&
                    (transactionData?.expired_time ||
                      transactionData?.expired_at) ? (
                      <>
                        <div className="flex items-center gap-2 text-red-600 font-medium animate-pulse">
                          <Clock className="h-4 w-4" />
                          <span>Sisa Waktu Pembayaran</span>
                        </div>
                        <p className="text-xl font-mono font-bold mt-1">
                          {formatCountdown(remainingMs)}
                        </p>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle className="h-5 w-5" />
                        <span>Transaksi Selesai / Berakhir</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <div className="flex justify-between sm:block border-b sm:border-0 pb-2 sm:pb-0">
                    <span className="text-muted-foreground">Nomor Pesanan</span>
                    <p className="font-medium mt-0.5">{merchantRef}</p>
                  </div>
                  <div className="flex justify-between sm:block border-b sm:border-0 pb-2 sm:pb-0">
                    <span className="text-muted-foreground">
                      Metode Pembayaran
                    </span>
                    <p className="font-medium mt-0.5">
                      {transactionData?.payment_name ??
                        transactionData?.payment_method ??
                        "-"}
                    </p>
                  </div>
                  {expiresLocal && (
                    <div className="flex justify-between sm:block border-b sm:border-0 pb-2 sm:pb-0">
                      <span className="text-muted-foreground">Batas Waktu</span>
                      <p className="font-medium mt-0.5">{expiresLocal}</p>
                    </div>
                  )}
                  <div className="flex justify-between sm:block border-b sm:border-0 pb-2 sm:pb-0">
                    <span className="text-muted-foreground">
                      Status Terkini
                    </span>
                    <p className="font-medium mt-0.5">{displayStatus}</p>
                  </div>
                </div>

                <Separator />

                {/* Payment Actions: VA / QRIS */}
                <div className="space-y-6">
                  {/* Virtual Account */}
                  {(transactionData?.pay_code ||
                    transactionData?.va_number) && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                        Nomor Virtual Account
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <code className="text-xl sm:text-2xl font-mono font-bold tracking-wider text-primary">
                          {transactionData?.pay_code ??
                            transactionData?.va_number}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-2"
                          onClick={() => {
                            const txt = String(
                              transactionData?.pay_code ??
                                transactionData?.va_number ??
                                ""
                            );
                            if (!txt) return;
                            try {
                              navigator.clipboard.writeText(txt);
                              toast({
                                title: "Disalin",
                                description: "Nomor VA telah disalin.",
                              });
                            } catch {}
                          }}
                        >
                          <Copy className="h-4 w-4" />
                          <span className="hidden sm:inline">Salin</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* QRIS */}
                  {(transactionData?.qr_url || transactionData?.qr_string) && (
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl bg-muted/20">
                      <p className="font-medium mb-4">
                        Scan QRIS untuk Membayar
                      </p>
                      {transactionData?.qr_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={transactionData.qr_url}
                          alt="QRIS Code"
                          className="w-48 h-48 object-contain bg-white p-2 rounded-lg shadow-sm"
                        />
                      ) : (
                        <div className="w-full max-w-xs break-all text-xs bg-muted p-4 rounded">
                          {transactionData.qr_string}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Link Button */}
                  {transactionData?.payment_url && (
                    <Button className="w-full" size="lg" asChild>
                      <a
                        href={transactionData.payment_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Buka Halaman Pembayaran
                      </a>
                    </Button>
                  )}
                </div>

                {/* Instructions Accordion */}
                {Array.isArray(transactionData?.instructions) &&
                  transactionData.instructions.length > 0 && (
                    <Accordion
                      type="single"
                      collapsible
                      className="w-full border rounded-lg"
                    >
                      <AccordionItem
                        value="instructions"
                        className="border-none"
                      >
                        <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/50 rounded-t-lg">
                          <span className="font-medium">
                            Lihat Instruksi Pembayaran
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 pt-2 bg-muted/10">
                          <div className="space-y-6 mt-2">
                            {transactionData.instructions.map(
                              (ins: any, idx: number) => {
                                const title =
                                  ins?.title ||
                                  ins?.method ||
                                  `Langkah ${idx + 1}`;
                                const steps = Array.isArray(ins?.steps)
                                  ? ins.steps
                                  : Array.isArray(ins)
                                  ? ins
                                  : [];
                                if (steps.length === 0) {
                                  return (
                                    <div key={idx} className="text-sm">
                                      {typeof ins === "string"
                                        ? ins
                                        : JSON.stringify(ins)}
                                    </div>
                                  );
                                }
                                return (
                                  <div key={idx}>
                                    <h5 className="font-semibold text-sm mb-2 text-primary">
                                      {title}
                                    </h5>
                                    <ol className="list-decimal list-outside ml-4 space-y-1 text-sm text-muted-foreground">
                                      {steps.map((step: string, i: number) => (
                                        <li
                                          key={i}
                                          dangerouslySetInnerHTML={{
                                            __html: step,
                                          }}
                                        />
                                      ))}
                                    </ol>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
              </>
            )}
          </CardContent>

          <CardFooter className="bg-muted/30 py-3 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  autoRefresh ? "bg-green-500 animate-pulse" : "bg-gray-300"
                }`}
              />
              <span>Auto-refresh: {autoRefresh ? "Aktif" : "Mati"}</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">
                Updated:{" "}
                {lastUpdatedAt
                  ? new Date(lastUpdatedAt).toLocaleTimeString()
                  : "-"}
              </span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoRefresh((v) => !v)}
                className="flex-1 sm:flex-none"
              >
                {autoRefresh ? "Stop Refresh" : "Auto Refresh"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isRefreshing}
                onClick={() => fetchStatus(false)}
                className="flex-1 sm:flex-none"
              >
                <RefreshCw
                  className={`mr-2 h-3 w-3 ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      <div className="flex justify-between mt-2">
        <Button variant="secondary" onClick={() => router.push("/checkout")}>
          Kembali
        </Button>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div>Loading payment page...</div>}>
      <PaymentContent />
    </Suspense>
  );
}
