"use client";

import { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { formatRupiah } from "@/helper/format-rupiah";
import { IoMdAdd } from "react-icons/io";
import { MdOutlineImage } from "react-icons/md";
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
}: {
  product: Product;
  deleteProduct?: (id: string) => void;
  variant?: "default" | "control";
  editProduct?: (product: Product) => void;
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
    type,
    color,
    objective,
  } = product;

  const sizeMap: { [key: string]: string } = {
    S: "Small",
    M: "Medium",
    L: "Large",
    XL: "Extra Large",
  };

  const [ConfirmDialog, Confirm] = useConfirm(
    "Hapus Produk",
    "Apakah Anda yakin ingin menghapus produk ini?"
  );

  const { mutate, isPending } = UseAddCart({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product added to cart",
      });
    },
    onError: (e) => {
      console.log(e);
      toast({
        title: "Failed",
        description: "Failed to add product to cart",
      });
    },
  });

  const handleAddToCart = () => {
    if (!session) {
      toast({
        title: "Please log in",
        description: "You need to log in to add items to the cart.",
        variant: "destructive",
      });
      return;
    }
    mutate({
      cartId: Number(product?.id),
      quantity: 1,
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
          {imageUrl?.url ? (
            <Image
              width={200}
              height={200}
              loading="lazy"
              src={imageUrl?.url || "/placeholder.svg?height=200&width=200"}
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
            </div>
            <Badge variant="outline">
              {product?.size ? sizeMap[size] : "Unknown"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-lg font-bold">{formatRupiah(price)}</p>
              <Badge variant="secondary">Stok: {stock}</Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {[type, objective, color].filter(Boolean).map((item, index) => (
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
        {imageUrl ? (
          <Image
            className="aspect-square mb-4 w-full object-cover"
            src={imageUrl.url}
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
        <h4 className="font-semibold text-xl line-clamp-1">{name}</h4>
        <span className="text-[#676767] text-sm line-clamp-1">
          {description}
        </span>
        <span className="font-medium">{formatRupiah(price)}</span>
      </Link>
    </div>
  );
};
