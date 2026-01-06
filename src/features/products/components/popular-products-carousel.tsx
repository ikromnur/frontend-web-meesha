// Komponen ini menampilkan carousel "Produk Populer" yang bersumber
// dari backend rekomendasi/SAW. Alur kerjanya:
// 1) Mengambil data rekomendasi via hook UseFetchRecommendations yang
//    berkomunikasi ke backend di port 4000 (endpoint
//    `/api/products/recommendations`). Jika rekomendasi kosong/error,
//    hook otomatis fallback ke `/api/products/popular` yang sekarang
//    juga SAW-backed.
// 2) Payload backend bisa dalam beberapa bentuk: langsung Product[]
//    (Format A) atau bentuk SAW (Format B) `{ product, score,
//    scoreBreakdown, stats, badge }`. Komponen ini mengekstrak kedua
//    bentuk tersebut secara fleksibel agar FE tetap stabil.
// 3) Untuk setiap item, komponen menghitung alasan utama skor SAW
//    (primaryReason: Price/Popularity/Size) dari `scoreBreakdown` dan
//    `weights` untuk transparansi fitur. Metadata seperti `sold_30d`
//    dan `badge: "Hotsale"` ikut diteruskan ke `CardProduct`.
// 4) UI: menampilkan skeleton saat loading, pesan halus ketika kosong,
//    dan daftar kartu produk ketika tersedia; mendukung label
//    “Trending 🔥” berdasarkan badge dari backend.
"use client";

// Import React dan dependensi UI. `CardProduct` akan menampilkan detail
// produk, termasuk badge Trending 🔥 dan transparansi SAW (skor,
// alasan utama, penjualan 30 hari).
import React from "react";
import { UseFetchRecommendations } from "@/features/products/api/use-fetch-recommendations";
import { useToast } from "@/hooks/use-toast";
import { CardProduct } from "@/features/products/components/card-product";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Props {
  title?: string;
  limit?: number; // 10 for products page, 6–10 for home
  seeAllHref?: string; // optional see all link for home
  className?: string;
}

// Komponen utama dengan props opsional: judul, limit jumlah item,
// tautan "Lihat Semua", dan className untuk styling container.
export const PopularProductsCarousel: React.FC<Props> = ({
  title = "Produk Populer",
  limit = 10,
  seeAllHref,
  className,
}) => {
  const { toast } = useToast();

  // Hook rekomendasi: memanggil backend `/api/products/recommendations`
  // dengan query `limit`. Jika kosong/error, hook melakukan fallback ke
  // `/api/products/popular`. Nilai kembali bentuknya:
  // { items: Product[], ids: string[], raw: payloadAsli }
  const { data: recs, isLoading } = UseFetchRecommendations({ limit });
  const popular = recs?.items ?? [];
  // Ambil raw payload (Format B: { product, score, scoreBreakdown, stats })
  // Ekstraksi SAW raw items dengan bentuk fleksibel. Bagian ini
  // memeriksa beberapa kemungkinan kunci array agar kompatibel dengan
  // variasi respons backend (data/items/recommendations/results, termasuk
  // ketika bersarang di `data.*`). Tujuannya supaya FE tidak patah saat
  // bentuk respons berubah atau berbeda antar endpoint.
  const rawItems: any[] = Array.isArray(recs?.raw?.data)
    ? (recs!.raw!.data as any[])
    : Array.isArray(recs?.raw?.items)
    ? (recs!.raw!.items as any[])
    : Array.isArray(recs?.raw?.recommendations)
    ? (recs!.raw!.recommendations as any[])
    : Array.isArray(recs?.raw?.results)
    ? (recs!.raw!.results as any[])
    : Array.isArray(recs?.raw?.data?.data)
    ? (recs!.raw!.data!.data as any[])
    : Array.isArray(recs?.raw?.data?.items)
    ? (recs!.raw!.data!.items as any[])
    : Array.isArray(recs?.raw?.data?.recommendations)
    ? (recs!.raw!.data!.recommendations as any[])
    : Array.isArray(recs?.raw?.data?.results)
    ? (recs!.raw!.data!.results as any[])
    : [];
  // Simpan peta id -> raw item SAW untuk mengambil metadata per kartu
  // saat render (skor, breakdown, penjualan, badge).
  const byId = new Map<string, any>();
  rawItems.forEach((it: any) => {
    const prod = it?.product ?? it;
    const id = prod?.id ? String(prod.id) : undefined;
    if (id) byId.set(id, it);
  });

  // Menghitung alasan utama (primaryReason) berdasarkan kontribusi
  // tertinggi dari masing-masing kriteria (price/popularity/size).
  // Nilai ini digunakan untuk memberi konteks pada rekomendasi di UI.
  function computePrimaryReason(
    item: any
  ): "Price" | "Popularity" | "Size" | undefined {
    const br = item?.scoreBreakdown;
    if (!br) return undefined;
    const w = br?.weights ?? {};
    const price = (w.price ?? 0) * (br.priceNorm ?? 0);
    const pop = (w.popularity ?? 0) * (br.popularityNorm ?? 0);
    const size = (w.size ?? 0) * (br.sizeNorm ?? 0);
    const max = Math.max(price, pop, size);
    if (max === price) return "Price";
    if (max === pop) return "Popularity";
    if (max === size) return "Size";
    return undefined;
  }
  // Jika kosong, beri tahu user secara halus (tanpa menyebut SAW)
  if (!isLoading && popular.length === 0) {
    // Hindari toast berulang-ulang saat render; cukup info sekali
    // (React StrictMode bisa memanggil dua kali di dev, sehingga kita tidak selalu toast)
  }

  return (
    <section className={className ?? "w-full mx-auto max-w-screen-xl"}>
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xl md:text-2xl font-semibold">{title}</h2>
        {seeAllHref ? (
          <Button asChild variant="link" size="lg">
            <Link href={seeAllHref}>Lihat Semua</Link>
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <div
          className="flex gap-4 md:gap-6 lg:gap-8 px-1"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {isLoading ? (
            // Saat loading: tampilkan skeleton sejumlah `limit` (maks 10)
            [...Array(Math.min(limit, 10))].map((_, i) => (
              <div
                key={i}
                className="min-w-[220px] md:min-w-[240px] lg:min-w-[260px]"
                style={{ scrollSnapAlign: "start" }}
              >
                <div className="w-full aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
                  <Skeleton className="h-10 w-10" />
                </div>
                <Skeleton className="h-4 w-[180px] mb-2" />
                <Skeleton className="h-3 w-[120px]" />
              </div>
            ))
          ) : (popular.length ?? 0) === 0 ? (
            // Ketika tidak ada data: tampilkan pesan halus
            <div className="text-sm text-muted-foreground px-1 py-6">
              Produk populer belum tersedia.
            </div>
          ) : (
            // Render setiap produk sebagai kartu; metadata SAW (skor,
            // alasan utama, penjualan 30 hari, badge) diambil dari peta
            // `byId` agar akurat per-produk.
            popular.map((p) => (
              <div
                key={p.id}
                className="min-w-[220px] md:min-w-[240px] lg:min-w-[260px]"
                style={{ scrollSnapAlign: "start" }}
              >
                {(() => {
                  const item = byId.get(p.id);
                  const score: number | undefined =
                    typeof item?.score === "number" ? item.score : undefined;
                  const primaryReason = computePrimaryReason(item);
                  const sold30d: number | undefined = item?.stats?.sold_30d;
                  const badge: string | undefined =
                    typeof item?.badge === "string" ? item.badge : undefined;
                  return (
                    <CardProduct
                      product={p}
                      sawScore={score}
                      primaryReason={primaryReason}
                      sold30d={sold30d}
                      badge={badge}
                    />
                  );
                })()}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
