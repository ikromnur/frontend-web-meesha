"use client";

import { Availability, Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { formatRupiah } from "@/helper/format-rupiah";
import { IoMdAdd } from "react-icons/io";
import { MdOutlineImage } from "react-icons/md";
import { FaStar } from "react-icons/fa";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { UseAddCart } from "@/features/cart/api/use-add-cart";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";

export const CardProduct = ({
  product,
  deleteProduct,
  variant = "default",
  editProduct,
  sawScore,
  primaryReason,
  sold30d,
  badge,
}: {
  product: Product;
  deleteProduct?: (id: string) => void;
  variant?: "default" | "control";
  editProduct?: (product: Product) => void;
  sawScore?: number;
  primaryReason?: "Price" | "Popularity" | "Size";
  sold30d?: number;
  badge?: string;
}) => {
  const { data: session } = useSession();
  const { toast } = useToast();
  const {
    id,
    name,
    imageUrl,
    description,
    price,
    size,
    stock,
    category,
    color,
    objective,
  } = product;

  // Normalize main image from product.images (preferred) or legacy imageUrl
  const primaryUrl: string = (() => {
    const anyProduct: any = product as any;
    const imgs = anyProduct?.images;
    if (Array.isArray(imgs) && imgs.length) {
      const first = imgs[0];
      if (typeof first === "string") return first;
      if (first?.url) return String(first.url);
    }
    const img: any = imageUrl as any;
    if (typeof img === "string") return img;
    if (Array.isArray(img)) {
      const first = img[0];
      if (typeof first === "string") return first;
      return first?.url ?? "";
    }
    return img?.url ?? "";
  })();

  const sizeMap: { [key: string]: string } = {
    S: "Small",
    M: "Medium",
    L: "Large",
    XL: "Extra Large",
    XXL: "Extra Extra Large",
  };

  const availabilityLabel = (a?: Availability) => {
    switch (a) {
      case Availability.READY:
        return "Ready di toko";
      case Availability.PO_2_DAY:
        return "Pre-Order 2 hari";
      case Availability.PO_5_DAY:
        return "PO 5 hari";
      default:
        return "Ketersediaan tidak diketahui";
    }
  };

  const availabilityBadgeClass = (a?: Availability) => {
    switch (a) {
      case Availability.READY:
        return "bg-green-600 text-white";
      case Availability.PO_2_DAY:
        return "bg-yellow-500 text-black";
      case Availability.PO_5_DAY:
        return "bg-orange-500 text-white";
      default:
        return "bg-gray-300 text-gray-900";
    }
  };

  const [ConfirmDialog, Confirm] = useConfirm(
    "Hapus Produk",
    "Apakah Anda yakin ingin menghapus produk ini?"
  );

  const { mutate, isPending } = UseAddCart({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Produk ditambahkan ke keranjang",
      });
    },
    onError: (e) => {
      console.log(e);
      toast({
        title: "Failed",
        description: "Gagal menambahkan produk ke keranjang",
      });
    },
  });

  const handleAddToCart = () => {
    if (!session) {
      toast({
        title: "Please log in",
        description: "Anda harus login untuk menambahkan item ke keranjang.",
        variant: "destructive",
      });
      return;
    }
    mutate({
      productId: product.id, // kirim UUID string tanpa konversi
      quantity: 1,
      // Sertakan ukuran jika produk memiliki ukuran
      size: product.size ?? undefined,
    });
  };

  const handleDeleteProduct = async (id: string) => {
    const ok = await Confirm();

    if (!ok) {
      return;
    }

    deleteProduct?.(id);
  };

  if (variant === "control") {
    return (
      <Card key={id} className="overflow-hidden">
        <div className="h-48 overflow-hidden">
          {primaryUrl ? (
            <Image
              width={200}
              height={200}
              loading="lazy"
              src={primaryUrl || "/placeholder.svg?height=200&width=200"}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className=" w-full h-full bg-muted flex items-center justify-center">
              <MdOutlineImage size={40} className="text-muted-foreground" />
            </div>
          )}
        </div>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg line-clamp-1">{name}</CardTitle>
              <CardDescription>{category?.name}</CardDescription>
              {/* Rating summary (average + count) if available */}
              {((product?.averageRating ?? 0) > 0 ||
                (product?.ratingCount ?? 0) > 0) && (
                <div className="flex items-center gap-1 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <FaStar
                      key={i}
                      className={
                        (product?.averageRating ?? 0) >= i + 1
                          ? "text-yellow-500"
                          : "text-gray-300"
                      }
                      size={12}
                    />
                  ))}
                  <span className="text-[10px] text-muted-foreground ml-1">
                    {(product?.averageRating ?? 0).toFixed(1)} •{" "}
                    {product?.ratingCount ?? 0} ulasan
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {product?.size ? sizeMap[size] : "Unknown"}
              </Badge>
              {product?.availability && (
                <Badge
                  className={availabilityBadgeClass(
                    product.availability as Availability
                  )}
                >
                  {availabilityLabel(product.availability as Availability)}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-lg font-bold">{formatRupiah(price)}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Terjual {product.sold || 0}
                </span>
                <Badge variant="secondary">Stok: {stock}</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {[objective, color].filter(Boolean).map((item, index) => (
                <Badge key={index} variant="secondary">
                  {item.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              editProduct?.(product);
            }}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDeleteProduct(id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Hapus
          </Button>
        </CardFooter>
        <ConfirmDialog />
      </Card>
    );
  }

  return (
    <div className="relative hover:scale-105 duration-300 transition-transform">
      {badge === "Hotsale" ? (
        <Badge className="absolute top-2 left-2 z-10" variant="secondary">
          Trending 🔥
        </Badge>
      ) : null}
      <Button
        disabled={isPending}
        className="absolute top-2 right-2 z-10"
        size={"icon"}
        type="button"
        onClick={handleAddToCart}
      >
        <IoMdAdd />
      </Button>
      <Link href={`/products/${product.id}`}>
        {primaryUrl ? (
          <Image
            className="aspect-square mb-4 w-full object-cover"
            src={primaryUrl}
            width={500}
            height={500}
            loading="lazy"
            alt="product"
          />
        ) : (
          <div className="aspect-square mb-4 w-full bg-muted flex items-center justify-center">
            <MdOutlineImage size={40} className="text-muted-foreground" />
          </div>
        )}
        <div className="flex justify-between items-start">
          <h4 className="font-semibold text-xl line-clamp-1">{name}</h4>
          <Badge variant="outline">
            {product?.size ? sizeMap[size] : "Unknown"}
          </Badge>
        </div>
        {/* Availability badge for shoppers */}
        {product?.availability && (
          <div className="mt-1">
            <Badge
              className={availabilityBadgeClass(
                product.availability as Availability
              )}
            >
              {availabilityLabel(product.availability as Availability)}
            </Badge>
          </div>
        )}
        {/* Rating summary (average + count) if available */}
        {((product?.averageRating ?? 0) > 0 ||
          (product?.ratingCount ?? 0) > 0) && (
          <div className="flex items-center gap-1 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <FaStar
                key={i}
                className={
                  (product?.averageRating ?? 0) >= i + 1
                    ? "text-yellow-500"
                    : "text-gray-300"
                }
                size={12}
              />
            ))}
            <span className="text-[10px] text-muted-foreground ml-1">
              {(product?.averageRating ?? 0).toFixed(1)} •{" "}
              {product?.ratingCount ?? 0} ulasan
            </span>
          </div>
        )}
        <span className="text-[#676767] text-sm line-clamp-1">
          {description}
        </span>
        <div className="flex justify-between items-center mt-1">
          <span className="font-medium">{formatRupiah(price)}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Terjual {product.sold || 0}
            </span>
            {stock <= 0 ? (
              <Badge variant="destructive">Stok Habis</Badge>
            ) : (
              <Badge variant="secondary">Stok: {stock}</Badge>
            )}
          </div>
        </div>
        {typeof sawScore === "number" ? (
          <div className="text-xs text-muted-foreground mt-1">
            Skor: {sawScore.toFixed(2)}
            {primaryReason
              ? ` • ${
                  primaryReason === "Price"
                    ? "Harga Terbaik"
                    : primaryReason === "Popularity"
                    ? "Terlaris"
                    : primaryReason === "Size"
                    ? "Ukuran Pas"
                    : primaryReason
                }`
              : ""}
            {typeof sold30d === "number" ? ` • Terjual 30h: ${sold30d}` : ""}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-1 mt-2">
          {[objective, color].filter(Boolean).map((item, index) => (
            <Badge key={index} variant="secondary">
              {item.name}
            </Badge>
          ))}
        </div>
      </Link>
    </div>
  );
};
