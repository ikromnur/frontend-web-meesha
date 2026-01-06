"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Quantity from "@/components/container/quantity";
import { UseAddCart } from "@/features/cart/api/use-add-cart";
import { useToast } from "@/hooks/use-toast";
import { UseFetchProduct } from "@/features/products/api/use-fetch-product";
import { MdOutlineImage } from "react-icons/md";
import { FaStar } from "react-icons/fa";
import { useSession } from "next-auth/react";
import { UseFetchRecommendations } from "@/features/products/api/use-fetch-recommendations";
import { PopularProductsCarousel } from "@/features/products/components/popular-products-carousel";
import { formatRupiah } from "@/helper/format-rupiah";
import { Availability } from "@/types/product";
import { ProductReviews } from "@/features/products/components/ProductReviews";

const DetailProduct = () => {
  const { data: session } = useSession();
  const params = useParams();
  const { toast } = useToast();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [qty, setQty] = useState(1);
  const [activeImageIndex, setActiveIndex] = useState(0);

  const {
    data: product,
    isLoading,
    isError,
  } = UseFetchProduct({
    id: id!,
    onError(e) {
      console.log(e);
      // Toast error tetap ada, tapi UI juga akan menyesuaikan
      toast({
        title: "Failed",
        description: "Gagal mengambil data produk",
        variant: "destructive",
      });
    },
  });

  // Fetch top-10 recommendations to decide HotSale badge
  const { data: recs } = UseFetchRecommendations({ limit: 10 });
  const isHotSale = !!(product?.id && recs?.ids?.includes(product.id));

  const { mutate, isPending } = UseAddCart({
    onSuccess: () => {
      setQty(1);
      toast({
        title: "Success",
        description: "Produk ditambahkan ke keranjang",
        variant: "default",
      });
    },
    onError(e) {
      toast({
        title: "Error",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const handleAddToCart = () => {
    if (!session) {
      toast({
        title: "Login Required",
        description: "Silakan login terlebih dahulu",
        variant: "destructive",
      });
      return;
    }
    if (!product) return;
    mutate({ productId: product.id, quantity: qty });
  };

  const availabilityBadgeClass = (status: Availability) => {
    switch (status) {
      case "READY":
        return "bg-green-100 text-green-700 hover:bg-green-200 border-green-200";
      case "PO_2_DAY":
      case "PO_5_DAY":
        return "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200";
    }
  };

  const availabilityLabel = (status: Availability) => {
    if (status === "READY") return "Ready Stock";
    if (status === "PO_2_DAY") return "Pre-Order (2 Hari)";
    if (status === "PO_5_DAY") return "Pre-Order (5 Hari)";
    return status;
  };

  const gallery = product?.images?.map((img: any) => img.url) || [];

  const sizeMap: Record<string, string> = {
    S: "Small",
    M: "Medium",
    L: "Large",
    XL: "Extra Large",
  };

  // 1. Handle Loading
  if (!id || isLoading)
    return (
      <div className="min-h-screen pt-24 pb-10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );

  // 2. Handle Error atau Produk Tidak Ditemukan
  if (isError || !product) {
    return (
      <div className="min-h-screen pt-24 pb-10 flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Gagal Memuat Produk
        </h2>
        <p className="text-gray-600 mb-6">
          Maaf, produk yang Anda cari tidak ditemukan atau terjadi kesalahan.
        </p>
        <Button onClick={() => window.location.reload()}>Coba Lagi</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-10 container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Gallery Section */}
        <section>
          {gallery.length > 0 ? (
            <div className="relative">
              <div className="relative w-full aspect-[6/7] rounded-lg overflow-hidden border bg-gray-50">
                <Image
                  src={gallery[activeImageIndex]}
                  alt={product?.name || "Product Image"}
                  fill
                  className="object-cover"
                />
              </div>
              {gallery.length > 1 ? (
                <>
                  <button
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-gray-700 rounded-full shadow p-2"
                    onClick={() =>
                      setActiveIndex(
                        (i) => (i - 1 + gallery.length) % gallery.length
                      )
                    }
                  >
                    ‹
                  </button>
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-gray-700 rounded-full shadow p-2"
                    onClick={() =>
                      setActiveIndex((i) => (i + 1) % gallery.length)
                    }
                  >
                    ›
                  </button>
                </>
              ) : null}
              {gallery.length > 1 && (
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {gallery.map((src: string, idx: number) =>
                    idx === activeImageIndex ? null : (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveIndex(idx)}
                        className={`relative border-2 rounded-md overflow-hidden transition-transform hover:scale-[1.02] ${
                          activeImageIndex === idx
                            ? "border-orange-500 ring-2 ring-orange-300"
                            : "border-muted"
                        }`}
                      >
                        <Image
                          className="w-full aspect-square object-cover"
                          src={src}
                          alt={`thumb-${idx + 1}`}
                          width={200}
                          height={200}
                        />
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full aspect-[6/7] bg-muted flex items-center justify-center text-muted-foreground rounded-md">
              <MdOutlineImage className="text-muted-foreground" size={52} />
            </div>
          )}
        </section>

        {/* Details Section - Dirapikan Vertikal */}
        <section className="bg-[#FAFBFC] p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 h-fit">
          {isHotSale && (
            <Badge variant={"destructive"} className="mb-3">
              Hotsale
            </Badge>
          )}

          <h1 className="font-bold text-2xl md:text-3xl mb-2 text-gray-900">
            {product?.name}
          </h1>

          {/* Availability & Rating */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {product?.availability && (
              <div className="flex items-center gap-2">
                <Badge
                  className={availabilityBadgeClass(
                    product.availability as Availability
                  )}
                >
                  {availabilityLabel(product.availability as Availability)}
                </Badge>
              </div>
            )}
            {((product?.averageRating ?? 0) > 0 ||
              (product?.ratingCount ?? 0) > 0) && (
              <div className="flex items-center gap-1 border-l pl-3 border-gray-300">
                <FaStar className="text-yellow-400" size={16} />
                <span className="text-sm font-medium text-gray-700">
                  {(product?.averageRating ?? 0).toFixed(1)}
                </span>
                <span className="text-sm text-gray-500">
                  ({product?.ratingCount ?? 0} ulasan)
                </span>
              </div>
            )}
          </div>

          {/* Harga & Stok */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-primary mb-1">
              {formatRupiah(Number(product?.price ?? 0))}
            </h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <p>
                Stok Tersedia:{" "}
                <span
                  className={`font-medium ${
                    product?.stock && product.stock <= 0
                      ? "text-red-500"
                      : "text-gray-900"
                  }`}
                >
                  {Math.max(0, Number(product?.stock ?? 0))}
                </span>
              </p>
              <span>•</span>
              <p>
                Terjual:{" "}
                <span className="font-medium text-gray-900">
                  {Number(product?.sold ?? 0)}
                </span>
              </p>
            </div>
          </div>

          <hr className="border-gray-200 mb-6" />

          {/* Deskripsi */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
              Deskripsi Produk
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {product?.description || "Tidak ada deskripsi."}
            </p>
          </div>

          {/* Varian & Ukuran */}
          <div className="grid grid-cols-1 gap-6 mb-6">
            {/* Ukuran */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                Ukuran
              </h3>
              <div className="text-sm font-medium text-gray-700 bg-white border border-gray-200 px-3 py-2 rounded inline-block min-w-[100px] text-center">
                {product?.size ? sizeMap[product?.size] || product?.size : "-"}
              </div>
            </div>

            {/* Varian */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                Varian
              </h3>
              {product?.variant && product.variant.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {product.variant.map((variant: string) => (
                    <Badge
                      key={variant}
                      variant="outline"
                      className="text-sm py-1 px-3"
                    >
                      {variant}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-gray-500">-</span>
              )}
            </div>
          </div>

          {/* Detail Informasi (Tabel Rapi) */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-700">
                Spesifikasi Lengkap
              </h3>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div>
                <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Kategori
                </h4>
                <p className="font-medium text-gray-900">
                  {product?.category?.name ?? "-"}
                </p>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Tujuan (Objective)
                </h4>
                <p className="font-medium text-gray-900">
                  {product?.objective?.name ?? "-"}
                </p>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Warna
                </h4>
                <p className="font-medium text-gray-900">
                  {product?.color?.name ?? "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Add to Cart */}
          <div className="flex items-center justify-between gap-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm sticky bottom-0 md:static">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold hidden sm:inline">
                Jumlah:
              </span>
              <Quantity quantity={qty} onChange={setQty} />
            </div>
            <Button
              size={"lg"}
              onClick={handleAddToCart}
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? "Menambahkan..." : "Tambah ke Keranjang"}
            </Button>
          </div>
        </section>
      </div>

      {/* Customer Ratings & Comments */}
      <section className="mt-12">
        <ProductReviews productId={String(id)} />
      </section>

      {/* Popular products below the reviews */}
      <PopularProductsCarousel
        title="Produk Populer Lainnya"
        limit={10}
        className="mt-12"
      />
    </div>
  );
};

export default DetailProduct;
