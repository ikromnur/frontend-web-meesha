"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import ProgressStepper from "@/components/ui/progress-stepper";
import { UseGetCart } from "@/features/cart/api/use-get-cart";
import { formatRupiah } from "@/helper/format-rupiah";
import { Separator } from "@/components/ui/separator";
import UnauthorizePage from "@/components/pages/unauthorize";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { Cart } from "@/types/cart";
import { CalendarIcon, Clock } from "lucide-react";
import { Availability } from "@/types/product";

export default function CheckoutPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const { data: cartData = [], isLoading } = UseGetCart();
  // Normalisasi agar item bertipe jelas untuk linting/TypeScript
  const cartItems: Cart[] = Array.isArray(cartData) ? (cartData as Cart[]) : [];

  const [paymentInstructions, setPaymentInstructions] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [transactionData, setTransactionData] = useState<any | null>(null);
  const [merchantRef, setMerchantRef] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const POLL_INTERVAL_MS = 5000;
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState<{
    code: string;
    value: number;
    type: "PERCENTAGE" | "FIXED_AMOUNT";
  } | null>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [discountStatus, setDiscountStatus] = useState<{
    state: "idle" | "checking" | "valid" | "invalid";
    reason?: string;
  }>({ state: "idle" });
  const [pickupDate, setPickupDate] = useState<Date | undefined>(undefined);
  const [pickupTime, setPickupTime] = useState<string>("");
  const [dateOpen, setDateOpen] = useState(false);

  // Hitung minimum jadwal pengambilan berdasarkan item di keranjang
  const STORE_OPEN_MINUTES = 9 * 60; // 09:00
  const STORE_CLOSE_MINUTES = 20 * 60; // 20:00

  function minutesFromTime(t: string): number | null {
    if (!t || !/^\d{2}:\d{2}$/.test(t)) return null;
    const [hh, mm] = t.split(":").map((n) => Number(n));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    return hh * 60 + mm;
  }

  function clampToStoreHours(d: Date): Date {
    const res = new Date(d);
    const minutes = res.getHours() * 60 + res.getMinutes();
    if (minutes < STORE_OPEN_MINUTES) {
      res.setHours(
        Math.floor(STORE_OPEN_MINUTES / 60),
        STORE_OPEN_MINUTES % 60,
        0,
        0
      );
    } else if (minutes > STORE_CLOSE_MINUTES) {
      // Geser ke hari berikutnya jam buka
      res.setDate(res.getDate() + 1);
      res.setHours(
        Math.floor(STORE_OPEN_MINUTES / 60),
        STORE_OPEN_MINUTES % 60,
        0,
        0
      );
    }
    return res;
  }

  // Normalisasi nilai availability (string bebas atau enum)
  function normalizeAvailability(val: any): Availability | undefined {
    if (!val) return undefined;
    if (
      val === Availability.PO_5_DAY ||
      val === Availability.PO_2_DAY ||
      val === Availability.READY
    )
      return val as Availability;
    const s = String(val).toUpperCase();
    const compact = s.replace(/[^A-Z0-9+]/g, "");
    if (
      (compact.includes("PO") || compact.includes("PREORDER")) &&
      compact.includes("5")
    )
      return Availability.PO_5_DAY;
    if (
      (compact.includes("PO") || compact.includes("PREORDER")) &&
      compact.includes("2")
    )
      return Availability.PO_2_DAY;
    if (compact.includes("READY")) return Availability.READY;
    if (compact.includes("H+5")) return Availability.PO_5_DAY;
    if (compact.includes("H+2")) return Availability.PO_2_DAY;
    return undefined;
  }

  function getItemAvailability(it: Cart): Availability | undefined {
    const v1 = (it as any)?.availability;
    const v2 = (it as any)?.product?.availability;
    return normalizeAvailability(v1 ?? v2);
  }

  // Helper untuk mendapatkan lead time (hari) dari availability string/enum
  function getLeadDays(val: any): number {
    if (val === Availability.PO_5_DAY) return 5;
    if (val === Availability.PO_2_DAY) return 2;
    if (val === Availability.READY) return 0;

    const s = String(val || "").toUpperCase();
    const compact = s.replace(/[^A-Z0-9+]/g, "");

    if (compact.includes("READY")) return 0;

    // Deteksi pola PO/PREORDER/H+ diikuti angka
    if (
      compact.includes("PO") ||
      compact.includes("PREORDER") ||
      compact.includes("H+")
    ) {
      const match = compact.match(/(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
      // Fallback jika terdeteksi PO tapi tanpa angka jelas, anggap 1 hari minimal
      return 1;
    }

    return 0; // Default READY
  }

  function computeMinPickupAt(items: Cart[]): Date {
    const now = new Date();
    // Buffer READY: +3 jam (sesuai backend); PO: +n hari
    const offsets = items.map((it) => {
      const v1 = (it as any)?.availability;
      const v2 = (it as any)?.product?.availability;
      const days = getLeadDays(v1 ?? v2);

      if (days > 0) return { days, hours: 0 };
      return { days: 0, hours: 3 }; // READY (buffer 3 jam)
    });
    const maxDays = Math.max(...offsets.map((o) => o.days), 0);
    const maxHours = Math.max(...offsets.map((o) => o.hours), 0);
    const base = new Date(now);
    base.setDate(base.getDate() + maxDays);

    if (maxDays > 0) {
      // Jika PO, reset waktu ke jam buka toko (09:00)
      // STORE_OPEN_MINUTES is defined in the outer scope
      base.setHours(
        Math.floor(STORE_OPEN_MINUTES / 60),
        STORE_OPEN_MINUTES % 60,
        0,
        0
      );
    } else {
      // Jika Ready, tambahkan buffer jam dari sekarang
      base.setHours(base.getHours() + maxHours);
    }

    const clamped = clampToStoreHours(base);
    return clamped;
  }

  const minPickupAt = useMemo(() => computeMinPickupAt(cartItems), [cartItems]);
  const minPickupDateOnly = useMemo(() => {
    const d = new Date(minPickupAt);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, [minPickupAt]);
  const minPickupMinutes = useMemo(
    () => minPickupAt.getHours() * 60 + minPickupAt.getMinutes(),
    [minPickupAt]
  );
  const maxLeadDays = useMemo(() => {
    return cartItems.reduce((max, it) => {
      const v1 = (it as any)?.availability;
      const v2 = (it as any)?.product?.availability;
      return Math.max(max, getLeadDays(v1 ?? v2));
    }, 0);
  }, [cartItems]);

  // Alasan edukasi PO/Ready untuk ditampilkan di UI "Minimal"
  const leadReason = useMemo(() => {
    if (maxLeadDays > 0) {
      return `karena item Pre Order ${maxLeadDays} hari di keranjang`;
    }
    return "ready di toko (estimasi 3 jam)";
  }, [maxLeadDays]);

  // Restore discount from sessionStorage on load
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = sessionStorage.getItem("checkout:discount");
      if (saved) {
        const obj = JSON.parse(saved);
        if (obj?.code && typeof obj?.value === "number" && obj?.type) {
          setDiscount({ code: obj.code, value: obj.value, type: obj.type });
          setDiscountCode(obj.code);
          setDiscountStatus({ state: "valid" });
        }
      }
    } catch {}
  }, []);

  const totalItems = useMemo(
    () => cartItems.reduce((sum, it) => sum + it.quantity, 0),
    [cartItems]
  );
  const subtotal = useMemo(
    () => cartItems.reduce((tot, it) => tot + it.price * it.quantity, 0),
    [cartItems]
  );
  const shippingFee = 0; // sesuai tampilan saat ini FREE
  const discountAmount = useMemo(() => {
    if (!discount) return 0;
    if (discount.type === "PERCENTAGE") {
      return Math.floor(
        (subtotal * Math.min(Math.max(discount.value, 0), 100)) / 100
      );
    }
    return Math.max(Math.min(discount.value, subtotal), 0);
  }, [discount, subtotal]);
  const totalPrice = subtotal + shippingFee;
  const totalAfterDiscount = Math.max(totalPrice - discountAmount, 0);

  // Validasi waktu pengambilan: antara 09:00 dan 20:00, dan >= min jika hari minimum
  const isValidPickupTime = (t: string) => {
    const minutes = minutesFromTime(t);
    if (minutes === null) return false;
    if (minutes < STORE_OPEN_MINUTES || minutes > STORE_CLOSE_MINUTES)
      return false;
    if (!pickupDate) return false;
    const selectedIsMinDay =
      pickupDate &&
      pickupDate.getFullYear() === minPickupDateOnly.getFullYear() &&
      pickupDate.getMonth() === minPickupDateOnly.getMonth() &&
      pickupDate.getDate() === minPickupDateOnly.getDate();
    if (selectedIsMinDay && minutes < minPickupMinutes) return false;
    return true;
  };

  // Countdown updater ketika transaksi aktif
  useEffect(() => {
    if (!transactionData?.expired_time) return;
    const tick = () => {
      const now = Date.now();
      const expMs = Number(transactionData.expired_time) * 1000;
      setRemainingMs(Math.max(expMs - now, 0));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [transactionData?.expired_time]);

  function formatCountdown(ms: number) {
    const s = Math.floor(ms / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  function shouldStopPolling(status?: string) {
    const doneStatuses = ["PAID", "EXPIRED", "FAILED"];
    return doneStatuses.includes(String(status || "").toUpperCase());
  }

  // Pindahkan alur pembayaran ke halaman Payment
  async function proceedToPayment() {
    try {
      setCreating(true);
      // Validasi pemilihan tanggal & waktu
      if (!pickupDate) {
        toast({
          title: "Tanggal belum dipilih",
          description: "Silakan pilih tanggal pengambilan.",
          variant: "destructive",
        });
        setCreating(false);
        return;
      }
      if (!isValidPickupTime(pickupTime)) {
        toast({
          title: "Waktu tidak valid",
          description:
            "Pilih jam antara 09:00–20:00 dan tidak sebelum minimum yang dihitung.",
          variant: "destructive",
        });
        setCreating(false);
        return;
      }

      // Simpan data session pilihan pickup (gunakan representasi lokal agar tidak bergeser UTC)
      const pickupDateLocal = (() => {
        const d = new Date(pickupDate);
        const yyyy = String(d.getFullYear());
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`; // YYYY-MM-DD (lokal)
      })();
      sessionStorage.setItem(
        "checkout:details",
        JSON.stringify({
          // simpan tanggal lokal agar halaman payment bisa merekonstruksi dengan benar
          pickupDate: pickupDateLocal,
          pickupTime,
        })
      );
      sessionStorage.setItem(
        "checkout:totalAfterDiscount",
        JSON.stringify(Math.max(totalAfterDiscount, 0))
      );
      sessionStorage.setItem(
        "checkout:cartSnapshot",
        JSON.stringify(Array.isArray(cartData) ? cartData : [])
      );

      // Buat Order di backend dan pastikan sukses sebelum lanjut
      let orderItems: any[] = [];
      try {
        orderItems = (Array.isArray(cartData) ? cartData : [])
          .map((it: any) => ({
            // Hanya gunakan id produk asli; hindari fallback ke id keranjang
            productId: it?.product?.id ?? it?.product_id ?? it?.productId,
            quantity: Math.round(it?.quantity ?? 1),
            price: Math.round(it?.product?.price ?? it?.price ?? 0),
          }))
          .filter((it: any) => !!it.productId);
        const payload: any = {
          shippingAddress: "Pickup - Meesha Store",
          paymentMethod: "TRIPAY",
          orderItems,
          // Sertakan jadwal pengambilan ke backend
          pickupAt: (() => {
            const [hStr, mStr] = String(pickupTime).split(":");
            // Bangun dari string lokal YYYY-MM-DDTHH:mm agar tidak terjadi pergeseran hari
            const localStr = `${pickupDateLocal}T${String(hStr).padStart(
              2,
              "0"
            )}:${String(mStr).padStart(2, "0")}:00`;
            const d = new Date(localStr);
            return d.toISOString();
          })(),
          // Tambahkan representasi lokal dan timezone agar backend tidak salah tafsir UTC
          pickupAtLocal: (() => {
            const [hStr, mStr] = String(pickupTime).split(":");
            const hh = String(hStr).padStart(2, "0");
            const mi = String(mStr).padStart(2, "0");
            // Format: YYYY-MM-DDTHH:mm (waktu lokal)
            return `${pickupDateLocal}T${hh}:${mi}`;
          })(),
          pickupTimezone:
            typeof Intl !== "undefined"
              ? Intl.DateTimeFormat().resolvedOptions().timeZone ||
                "Asia/Jakarta"
              : "Asia/Jakarta",
        };
        const { axiosInstance } = await import("@/lib/axios");
        // Sertakan fallback field untuk kompatibilitas backend lama
        const [pickupHour, pickupMinute] = String(pickupTime).split(":");
        const yyyy = String(pickupDateLocal.split("-")[0]);
        const mm = String(pickupDateLocal.split("-")[1]);
        const dd = String(pickupDateLocal.split("-")[2]);
        const hh = String(pickupHour).padStart(2, "0");
        const mi = String(pickupMinute).padStart(2, "0");
        const resp = await axiosInstance.post(`/orders`, {
          ...payload,
          pickup_date: `${yyyy}-${mm}-${dd}`,
          pickup_time: `${hh}:${mi}`,
          leadDays: maxLeadDays,
          discountCode: discountCode || undefined, // <--- Tambahkan baris ini
        });
        if (!resp?.data)
          throw new Error("Backend tidak mengembalikan data Order");
        const orderData = resp.data.data ?? resp.data;
        const orderId =
          orderData?.id ?? orderData?.orderId ?? orderData?.merchant_ref;
        if (!orderId)
          throw new Error("Order ID tidak ditemukan dalam respons backend");
        sessionStorage.setItem("checkout:orderId", String(orderId));
      } catch (err: any) {
        const status = err?.response?.status;
        // Ambil variasi pesan dari backend jika ada
        let serverMsg =
          err?.response?.data?.message || err?.response?.data?.error;

        if (serverMsg && typeof serverMsg === "object") {
          serverMsg = serverMsg.message || JSON.stringify(serverMsg);
        }

        if (!serverMsg && Array.isArray(err?.response?.data?.errors)) {
          serverMsg = err?.response?.data?.errors.join("; ");
        }
        let description =
          serverMsg ||
          err?.message ||
          "Periksa kembali data keranjang dan login.";
        // Log detail untuk investigasi 422 yang tidak memberi message
        if (!serverMsg && status === 422) {
          console.error("[Checkout] 422 payload error", {
            body: {
              orderItems,
              pickupTime,
            },
            response: err?.response?.data,
          });
        }
        // Hanya override pesan jika backend tidak memberi pesan yang jelas
        if (
          status === 422 &&
          maxLeadDays >= 2 &&
          !err?.response?.data?.message
        ) {
          const minDateStr = `${minPickupAt.toLocaleDateString()} ${String(
            minPickupAt.getHours()
          ).padStart(2, "0")}:${String(minPickupAt.getMinutes()).padStart(
            2,
            "0"
          )}`;
          const label =
            maxLeadDays >= 5 ? "PO 5 Hari (H+5)" : "PO 2 Hari (H+2)";
          description = `Pesanan Anda memiliki beberapa produk dengan waktu pengerjaan berbeda. Waktu pengambilan disatukan dan dihitung berdasarkan Pre-Order terlama (${label}). Pilih jadwal minimal ${minDateStr}.`;
        }
        toast({
          title: "Gagal membuat Order",
          description,
          variant: "destructive",
        });
        setCreating(false);
        return; // Jangan lanjut ke Payment jika Order gagal dibuat
      }

      router.push("/payment");
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  async function fetchStatus(silent = false) {
    if (!merchantRef) return;
    try {
      if (!silent) setIsRefreshing(true);
      const url = `/api/payments/tripay/transaction/${encodeURIComponent(
        merchantRef
      )}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.data)
        throw new Error(
          json?.message || `Gagal memuat status (HTTP ${res.status})`
        );
      const d = json.data;
      setTransactionData((prev: any) => ({ ...prev, ...d }));
      setPaymentInstructions(
        Array.isArray(d?.instructions) ? d.instructions : []
      );
      setLastUpdatedAt(Date.now());
      // perbarui countdown berdasarkan expired_time yang baru
      if (d?.expired_time) {
        const expMs = Number(d.expired_time) * 1000;
        setRemainingMs(Math.max(expMs - Date.now(), 0));
      }
      // hentikan auto refresh jika status sudah final
      if (shouldStopPolling(d?.status)) {
        setAutoRefresh(false);
      }
    } catch (e: any) {
      if (!silent) {
        toast({
          title: "Gagal refresh",
          description: e?.message ?? String(e),
          variant: "destructive",
        });
      }
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }

  async function handleContinue(selectedCode: string) {
    try {
      setCreating(true);
      const newMerchantRef = `INV-${Date.now()}`;
      // Bangun order_items sesuai ekspektasi backend: gunakan product.id sebagai productId
      let baseItems: {
        name: string;
        price: number;
        quantity: number;
        id?: any;
        product_id?: any;
        productId?: any;
      }[] = Array.isArray(cartData)
        ? cartData.map((i: any) => {
            const productId = i?.product?.id ?? i?.product_id ?? i?.productId;
            const name = i?.product?.name ?? i?.name;
            const price = Math.round(i?.product?.price ?? i?.price);
            const quantity = Math.round(i?.quantity ?? 1);
            return {
              // Sertakan beberapa alias id agar backend kompatibel
              id: productId,
              product_id: productId,
              productId,
              name,
              price,
              quantity,
            };
          })
        : [];
      // Validasi: semua item harus bernilai productId
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
      // Tambahkan item diskon sebagai item non-produk (tanpa productId)
      if (discount && discountAmount > 0) {
        baseItems.push({
          name: `Diskon (${discount.code})`,
          price: -Math.round(discountAmount),
          quantity: 1,
        });
      }
      // Jangan kirim item pickup sama sekali; kirim detailnya lewat notes saja
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
        }/orders/${newMerchantRef}`,
        expired_time: Math.floor(Date.now() / 1000) + 24 * 3600,
        // Kirim kode diskon agar backend dapat mencatat penggunaan (limit)
        discountCode: discount?.code,
        // Detail pickup tidak dikirim dari halaman Checkout
      };

      // Helper: post dengan satu kali retry untuk error 403/502 atau network
      const postOnce = async () => {
        const res = await fetch(`/api/payments/tripay/transaction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const js = await res.json().catch(() => ({}));
        return { res, js };
      };
      let { res: resp, js: json } = await postOnce();
      if (!resp.ok && [403, 502].includes(resp.status)) {
        await new Promise((r) => setTimeout(r, 1200));
        ({ res: resp, js: json } = await postOnce());
      }
      if (!resp.ok || !json?.success)
        throw new Error(
          json?.message || `Tripay create failed (status ${resp.status})`
        );

      const data = json.data;
      // Simpan detail transaksi dan tampilkan inline tanpa berpindah halaman
      setTransactionData(data);
      setMerchantRef(newMerchantRef);
      setLastUpdatedAt(Date.now());
      const instructions = data?.instructions ?? [];
      setPaymentInstructions(instructions);
      try {
        sessionStorage.setItem(
          `tripay:instructions:${newMerchantRef}`,
          JSON.stringify(data)
        );
      } catch {}
      // Setelah transaksi dibuat, mulai polling awal jika belum final
      if (!shouldStopPolling(data?.status)) {
        setAutoRefresh(true);
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  // Polling interval setiap 5 detik ketika autoRefresh aktif dan status belum final
  useEffect(() => {
    if (
      !merchantRef ||
      !transactionData ||
      !autoRefresh ||
      shouldStopPolling(transactionData?.status)
    )
      return;
    const id = setInterval(() => {
      fetchStatus(true);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [merchantRef, transactionData?.status, autoRefresh]);

  async function applyDiscount() {
    if (!discountCode.trim()) return;
    try {
      setApplyingDiscount(true);
      const res = await fetch(
        `/api/discounts/${encodeURIComponent(discountCode.trim())}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || "Kode diskon tidak valid");
      }
      const d = json?.data ?? json;
      if (!d?.code || typeof d?.value !== "number" || !d?.type) {
        throw new Error("Format diskon tidak valid");
      }
      setDiscount({ code: d.code, value: d.value, type: d.type });
      try {
        sessionStorage.setItem(
          "checkout:discount",
          JSON.stringify({ code: d.code, value: d.value, type: d.type })
        );
      } catch {}
      toast({
        title: "Diskon diterapkan",
        description: `Kode ${d.code} aktif`,
      });
    } catch (e: any) {
      setDiscount(null);
      toast({
        title: "Gagal",
        description: e?.message ?? "Kode diskon tidak valid",
        variant: "destructive",
      });
    } finally {
      setApplyingDiscount(false);
    }
  }

  if (!session) return <UnauthorizePage />;

  return (
    <div className="relative w-full max-w-screen-xl mx-auto px-4 py-6">
      <ProgressStepper currentStep={2} className="mb-8" />

      <div className="max-w-3xl mx-auto">
        {/* Kotak Checkout (satu kontainer) */}
        <section className="border rounded-md p-4 space-y-4">
          <h3 className="font-semibold">Checkout</h3>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">
              Memuat keranjang...
            </div>
          ) : totalItems === 0 ? (
            <div className="text-sm text-muted-foreground">
              Keranjang kosong
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item: Cart) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.quantity} x {item.name}
                  </span>
                  <span>{formatRupiah(item.price)}</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>{formatRupiah(shippingFee)}</span>
              </div>

              {/* Jadwal pengambilan di Checkout */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Jadwal Pengambilan</div>
                {/* Edukasi multi-order: jadwal mengikuti PO terlama */}
                <p className="text-xs text-muted-foreground">
                  Pesanan Anda bisa berisi produk Ready dan Pre Order. Waktu
                  pengambilan disatukan dan mengikuti Pre Order terlama
                  {maxLeadDays > 0
                    ? ` (PO ${maxLeadDays} Hari)`
                    : " (Ready, +3 Jam)"}
                  . Perkiraan siap diambil: {minPickupAt.toLocaleDateString()}
                  {maxLeadDays > 0 ? ` (H+${maxLeadDays})` : ""}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Tanggal
                    </div>
                    <Popover open={dateOpen} onOpenChange={setDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="inline-flex items-center gap-1"
                        >
                          <CalendarIcon className="w-4 h-4" />
                          {pickupDate
                            ? `${pickupDate.toLocaleDateString()}`
                            : "Pilih"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-2 w-[320px]">
                        <Calendar
                          mode="single"
                          selected={pickupDate}
                          onSelect={(d) => {
                            if (!d) return;
                            const only = new Date(
                              d.getFullYear(),
                              d.getMonth(),
                              d.getDate()
                            );
                            if (only < minPickupDateOnly) {
                              toast({
                                title: "Tanggal terlalu cepat",
                                description: `Minimal ${minPickupAt.toLocaleDateString()} ${String(
                                  minPickupAt.getHours()
                                ).padStart(2, "0")}:${String(
                                  minPickupAt.getMinutes()
                                ).padStart(2, "0")} (${leadReason})`,
                                variant: "destructive",
                              });
                              return;
                            }
                            setPickupDate(d);
                            setDateOpen(false);
                          }}
                          disabled={[{ before: minPickupDateOnly }]}
                          className="border rounded"
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Minimal: {minPickupAt.toLocaleDateString()}{" "}
                      {String(minPickupAt.getHours()).padStart(2, "0")}:
                      {String(minPickupAt.getMinutes()).padStart(2, "0")} (
                      {leadReason})
                    </p>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Jam
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        placeholder="HH:MM (09:00–20:00)"
                        className="border rounded px-3 py-2 text-sm w-40"
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="inline-flex items-center gap-1"
                          >
                            <Clock className="w-4 h-4" /> Pilih
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-2 w-48">
                          <div className="grid grid-cols-3 gap-1 max-h-[240px] overflow-y-auto">
                            {Array.from({
                              length:
                                Math.floor(
                                  (STORE_CLOSE_MINUTES - STORE_OPEN_MINUTES) /
                                    10
                                ) + 1,
                            }).map((_, idx) => {
                              const minutes = STORE_OPEN_MINUTES + idx * 10;
                              const hh = String(
                                Math.floor(minutes / 60)
                              ).padStart(2, "0");
                              const mm = String(minutes % 60).padStart(2, "0");
                              const t = `${hh}:${mm}`;
                              // Filter saran waktu agar tidak melanggar minimum pada hari minimum
                              const show = !pickupDate
                                ? true
                                : pickupDate.getFullYear() !==
                                    minPickupDateOnly.getFullYear() ||
                                  pickupDate.getMonth() !==
                                    minPickupDateOnly.getMonth() ||
                                  pickupDate.getDate() !==
                                    minPickupDateOnly.getDate() ||
                                  minutes >= minPickupMinutes;
                              if (!show) return null;
                              return (
                                <Button
                                  key={t}
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setPickupTime(t)}
                                >
                                  {t}
                                </Button>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    {!pickupTime ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Pilih jam antara 09:00–20:00. Interval 10 menit.
                      </p>
                    ) : isValidPickupTime(pickupTime) ? (
                      <p className="mt-2 text-xs text-green-700">
                        Waktu valid.
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-red-600">
                        Waktu tidak valid atau sebelum minimum.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="my-2" />
              <div className="text-sm font-medium">Masukkan Diskon</div>
              <div className="flex items-center gap-2">
                <input
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  placeholder="Masukkan kode diskon"
                  className="border rounded px-3 py-2 text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    applyingDiscount ||
                    totalItems === 0 ||
                    discountStatus.state === "checking"
                  }
                  onClick={applyDiscount}
                >
                  {applyingDiscount
                    ? "Menerapkan..."
                    : discountStatus.state === "checking"
                    ? "Memeriksa..."
                    : "Terapkan"}
                </Button>
                {discount && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setDiscount(null);
                      try {
                        sessionStorage.removeItem("checkout:discount");
                      } catch {}
                      setDiscountStatus({ state: "idle" });
                    }}
                  >
                    Hapus
                  </Button>
                )}
              </div>
              {discountStatus.state === "invalid" && (
                <p className="text-xs text-red-600">
                  {discountStatus.reason ?? "Kode diskon tidak valid"}
                </p>
              )}
              {discountStatus.state === "valid" && discount && (
                <p className="text-xs text-green-700">
                  Kode {discount.code} valid.{" "}
                  {discount.type === "PERCENTAGE"
                    ? `${discount.value}%`
                    : `Potongan Rp ${discount.value.toLocaleString()}`}
                </p>
              )}
              {discount && (
                <div className="flex justify-between text-sm text-green-700 items-center">
                  <span className="inline-flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs">
                      Diskon ({discount.code})
                    </span>
                    {discount.type === "PERCENTAGE" ? `${discount.value}%` : ""}
                  </span>
                  <span>-{formatRupiah(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <span>Total bayar</span>
                <span>{formatRupiah(totalAfterDiscount)}</span>
              </div>
              <div className="pt-2">
                <Button
                  disabled={
                    creating ||
                    totalAfterDiscount <= 0 ||
                    !pickupDate ||
                    !isValidPickupTime(pickupTime)
                  }
                  onClick={proceedToPayment}
                >
                  Lanjutkan ke Pembayaran
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Zona waktu: Asia/Jakarta. Jam operasional: 09:00–20:00. Offset
                  PO mengikuti kalender penuh.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="flex justify-between mt-6">
        <Button variant="secondary" onClick={() => router.push("/cart")}>
          Kembali
        </Button>
      </div>
    </div>
  );
}
