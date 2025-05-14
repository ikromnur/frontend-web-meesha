"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Quantity from "@/components/container/quantity";
import { UseAddCart } from "@/features/cart/api/use-add-cart";
import { useToast } from "@/hooks/use-toast";
import { UseFetchProduct } from "@/features/products/api/use-fetch-product";
import { MdOutlineImage } from "react-icons/md";
import { useSession } from "next-auth/react";

const DetailProduct = () => {
  const { data: session } = useSession();
  const params = useParams();
  const { toast } = useToast();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [qty, setQty] = useState(1);

  const { data: product, isLoading } = UseFetchProduct({
    id: id!,
    onError(e) {
      console.log(e);
      toast({
        title: "Failed",
        description: "Failed to fetch product",
        variant: "destructive",
      });
    },
  });

  const { mutate, isPending } = UseAddCart({
    onSuccess: () => {
      setQty(1);
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
        variant: "destructive",
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
      quantity: qty,
    });
  };

  useEffect(() => {
    if (product?.name) {
      document.title = product.name;
    }
  }, [product?.name]);

  const sizeMap: { [key: string]: string } = {
    S: "Small",
    M: "Medium",
    L: "Large",
    XL: "Extra Large",
  };

  if (!id || isLoading)
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="border-t-4 border-primary border-solid w-12 h-12 rounded-full animate-spin"></div>
      </div>
    );

  return (
    <div className="w-full mx-auto max-w-screen-xl pt-10 px-4">
      <div className="rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        <section>
          {product?.imageUrl ? (
            <Image
              className="w-full aspect-[6/7] object-cover"
              src={product?.imageUrl?.url}
              alt="product"
              loading="lazy"
              width={1000}
              height={1000}
            />
          ) : (
            <div className="w-full aspect-[6/7] bg-muted flex items-center justify-center text-muted-foreground">
              <MdOutlineImage className="text-muted-foreground" size={52} />
            </div>
          )}
        </section>
        <section className="bg-[#FAFBFC] p-8">
          <Badge variant={"destructive"} className="mb-3">
            Hotsale
          </Badge>
          <h1 className="font-semibold text-2xl mb-3">{product?.name}</h1>
          <h2 className="mb-3 text-sm font-semibold">Description:</h2>
          <p className="text-sm text-gray-500 mb-4">{product?.description}</p>
          <h2 className="mb-1 text-sm font-semibold">Size:</h2>
          <ol className="mb-4 list-disc pl-5">
            <li className="font-medium text-sm text-gray-500">
              {product?.size ? sizeMap[product?.size] : "Unknown"}
            </li>
          </ol>
          <h2 className="mb-3 text-sm font-semibold">Variant:</h2>
          <ol className="text-sm list-disc pl-5 text-gray-500 mb-28">
            {product?.variant.map((variant: string) => (
              <li key={variant}>{variant}</li>
            ))}
          </ol>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm font-semibold">Qty:</p>
              <Quantity quantity={qty} onChange={setQty} />
            </div>
            <Button size={"lg"} onClick={handleAddToCart} disabled={isPending}>
              {isPending ? "Adding..." : "Add to Cart"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DetailProduct;
