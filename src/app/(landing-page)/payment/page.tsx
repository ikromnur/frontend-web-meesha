"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
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
      } catch (e: any) {
        const message = e?.message ?? String(e);
        // Ignore 404 (Not Found) as it simply means transaction hasn't been created yet
        if (e?.response?.status === 404 || /404/.test(message)) {
          setStatusError(null);
          setAutoRefresh(false);
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
      // Jika ada transaksi dan sudah EXPIRED, blok pembuatan ulang
      const currentStatus = String(transactionData?.status || "").toUpperCase();
      const hasExpiry = Boolean(
        transactionData?.expired_time ?? transactionData?.expired_at
      );

      // CEK RESUME: Jika user memilih metode yang sama dengan transaksi UNPAID saat ini, jangan buat baru.
      // Ini mencegah duplikasi transaksi Tripay untuk order yang sama.
      const currentMethod = String(
        transactionData?.method || transactionData?.payment_method || ""
      ).toUpperCase();
      const selected = String(selectedCode || "").toUpperCase();
      const isUnpaid =
        currentStatus === "UNPAID" || currentStatus === "PENDING";

      // Metode dianggap sama jika stringnya persis sama atau salah satu mengandung yang lain
      // (misal "BNIVA" vs "BNI Virtual Account" - ini heuristik sederhana)
      // Tapi biasanya Tripay mengembalikan kode metode (misal "BNIVA") di field method.
      const isSameMethod =
        currentMethod === selected ||
        (currentMethod && selected && currentMethod.includes(selected));

      if (isUnpaid && isSameMethod && (!hasExpiry || remainingMs > 0)) {
        toast({
          title: "Transaksi Sudah Aktif",
          description:
            "Silakan lanjutkan pembayaran menggunakan instruksi yang sudah tersedia.",
        });
        setCreating(false);
        return;
      }

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
        // Setel masa berlaku transaksi 60 menit
        expired_time: Math.floor(Date.now() / 1000) + 60 * 60,
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
  useEffect(() => {
    const status = String(transactionData?.status || "").toUpperCase();
    const hasExpiry = Boolean(
      transactionData?.expired_time ?? transactionData?.expired_at
    );
    if (hasCancelled) return;
    if (
      (status === "EXPIRED" || (hasExpiry && remainingMs <= 0)) &&
      merchantRef
    ) {
      (async () => {
        try {
          await api
            .patch(`/api/orders/${encodeURIComponent(merchantRef)}`, {
              status: "CANCELLED",
            })
            .catch(() => {});
          setHasCancelled(true);
          setAutoRefresh(false);
        } catch {}
      })();
    }
  }, [
    transactionData?.status,
    transactionData?.expired_time,
    transactionData?.expired_at,
    remainingMs,
    merchantRef,
    hasCancelled,
  ]);

  if (!session) return <UnauthorizePage />;

  return (
    <div className="relative w-full max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      <ProgressStepper currentStep={3} className="mb-2" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="border rounded-md p-4 space-y-3">
          <h3 className="font-semibold">Pilih Metode Pembayaran</h3>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">
              Memuat keranjang...
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Total bayar</span>
                <span className="font-medium">
                  {formatRupiah(
                    initialTotal !== null ? initialTotal : totalAfterDiscount
                  )}
                </span>
              </div>
              <Separator />
              <div className="border rounded-md p-3">
                <div className="text-sm font-medium">
                  Ringkasan Jadwal Pengambilan
                </div>
                {pickupSummary ? (
                  <div className="text-sm mt-1">{pickupSummary}</div>
                ) : (
                  <div className="text-sm mt-1 text-muted-foreground">
                    Belum ada jadwal tersimpan. Pilih jadwal di Checkout lalu
                    lanjutkan.
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Zona waktu: Asia/Jakarta. Jam operasional: 09:00–22:00.
                </p>
              </div>
              <PaymentMethod
                totalPrice={
                  initialTotal !== null ? initialTotal : totalAfterDiscount
                }
                onContinue={handleContinue}
              />
              {creating && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Membuat transaksi...
                </div>
              )}
            </div>
          )}
        </section>

        <section className="border rounded-md p-4 space-y-3">
          <h3 className="font-semibold">Status Pembayaran</h3>
          {!transactionData ? (
            statusError && merchantRef ? (
              <div className="text-sm">
                <div className="text-red-600 font-medium">
                  Gagal memuat status: {statusError}
                </div>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isRefreshing}
                    onClick={() => fetchStatus(false)}
                  >
                    Coba lagi
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {merchantRef && !hasFetchAttempted
                  ? "Memuat status transaksi..."
                  : "Belum ada transaksi. Pilih metode dan lanjutkan."}
              </div>
            )
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Nomor Pesanan</div>
                  <div className="font-medium">{merchantRef}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Jumlah dibayar</div>
                  <div className="font-medium">
                    {formatRupiah(Number(transactionData?.amount ?? 0))}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Metode</div>
                  <div className="font-medium">
                    {transactionData?.payment_name ??
                      transactionData?.payment_method ??
                      "-"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <div className="font-medium">
                    {String(transactionData?.status ?? "-").toUpperCase()}
                  </div>
                </div>
                {expiresLocal ? (
                  <div>
                    <div className="text-muted-foreground">
                      Batas Pembayaran
                    </div>
                    <div className="font-medium">{expiresLocal}</div>
                  </div>
                ) : null}
                {!shouldStopPolling(
                  String(transactionData?.status || "").toUpperCase()
                ) &&
                (transactionData?.expired_time ||
                  transactionData?.expired_at) ? (
                  <div>
                    <div className="text-muted-foreground">Sisa waktu</div>
                    <div
                      className={`font-medium ${
                        remainingMs === 0 ? "text-red-600" : ""
                      }`}
                    >
                      {formatCountdown(remainingMs)}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Auto refresh: {autoRefresh ? "On" : "Off"}</span>
                <span>•</span>
                <span>
                  Terakhir diperbarui:{" "}
                  {lastUpdatedAt
                    ? new Date(lastUpdatedAt).toLocaleString()
                    : "-"}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isRefreshing || !merchantRef}
                  onClick={() => fetchStatus(false)}
                >
                  {isRefreshing ? "Merefresh..." : "Refresh Status"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAutoRefresh((v) => !v)}
                >
                  {autoRefresh
                    ? "Matikan Auto Refresh"
                    : "Nyalakan Auto Refresh"}
                </Button>
              </div>

              {(transactionData?.qr_url || transactionData?.qr_string) && (
                <div className="border rounded p-3">
                  <div className="text-sm font-medium mb-2">QRIS</div>
                  {transactionData?.qr_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={transactionData.qr_url}
                      alt="QRIS"
                      className="w-56 h-56 object-contain"
                    />
                  )}
                  {!transactionData?.qr_url && transactionData?.qr_string && (
                    <pre className="text-xs bg-muted p-2 rounded break-all">
                      {transactionData.qr_string}
                    </pre>
                  )}
                </div>
              )}

              {transactionData?.payment_url && (
                <div>
                  <a
                    href={transactionData.payment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button type="button" variant="default">
                      Buka Halaman Pembayaran
                    </Button>
                  </a>
                </div>
              )}

              {Array.isArray(transactionData?.instructions) &&
                transactionData.instructions.length > 0 && (
                  <div>
                    <h5 className="font-medium">Instruksi Pembayaran</h5>
                    <div className="space-y-3">
                      {transactionData.instructions.map(
                        (ins: any, idx: number) => {
                          const title =
                            ins?.title || ins?.method || "Instruksi";
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
                            <div key={idx} className="text-sm">
                              <div className="font-medium mb-1">{title}</div>
                              <ol className="list-decimal ml-5 space-y-1">
                                {steps.map((s: string, i: number) => (
                                  <li key={i}>{s}</li>
                                ))}
                              </ol>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

              {(transactionData?.pay_code || transactionData?.va_number) && (
                <div className="border rounded p-3">
                  <div className="text-sm font-medium mb-2">
                    Nomor Virtual Account
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono">
                      {transactionData?.pay_code ?? transactionData?.va_number}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
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
                      Salin
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

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
