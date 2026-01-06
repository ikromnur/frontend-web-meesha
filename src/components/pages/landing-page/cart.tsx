"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import ProgressStepper from "@/components/ui/progress-stepper";
import { CartItem } from "@/features/cart/components/card-cart";
import React from "react";
import { UseGetCart } from "@/features/cart/api/use-get-cart";
import { useToast } from "@/hooks/use-toast";
import { Cart } from "@/types/cart";
import { formatRupiah } from "@/helper/format-rupiah";
import { UseUpdateCart } from "@/features/cart/api/use-update-cart";
import { UseDeleteCart } from "@/features/cart/api/use-delete-cart";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import UnauthorizePage from "../unauthorize";

export default function CartPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const { data: cartData, refetch: refetchCart, isLoading } = UseGetCart({
    onError(e) {
      toast({
        title: "Terjadi kesalahan",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const { mutate: updateCart } = UseUpdateCart({
    onSuccess: () => {
      refetchCart();
    },
    onError: () => {
      toast({
        title: "Gagal",
        description: "Gagal memperbarui keranjang",
        variant: "destructive",
      });
    },
  });

  const { mutate: deleteCart } = UseDeleteCart({
    onSuccess: () => {
      refetchCart();
    },
    onError: () => {
      toast({
        title: "Gagal",
        description: "Gagal menghapus item keranjang",
        variant: "destructive",
      });
    },
  });

  const handleDeleteCart = (id: string) => {
    deleteCart(id);
  };

  const handleChangeQuantity = (id: string, quantity: number) => {
    updateCart({ cartId: id, quantity });
  };

  const totalItems = Array.isArray(cartData)
    ? cartData.reduce((sum: number, item: Cart) => sum + item.quantity, 0)
    : 0;

  const totalAmount = Array.isArray(cartData)
    ? cartData.reduce(
        (total: number, item: Cart) => total + item.price * item.quantity,
        0
      )
    : 0;

  if (!session) {
    return <UnauthorizePage />;
  }

  return (
    <div className="relative w-full max-w-screen-xl mx-auto px-4 py-6">
      <ProgressStepper currentStep={1} className="mb-8" />
      <div className="flex flex-col md:flex-row gap-12 md:gap-14 lg:gap-16">
        <div className="flex flex-col gap-4 w-full border rounded-md p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Memuat keranjang...</p>
              </div>
            </div>
          ) : Array.isArray(cartData) && cartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-5xl mb-4">🛒</div>
              <h3 className="text-xl font-semibold mb-2">Keranjang Kosong</h3>
              <p className="text-muted-foreground mb-4">
                Belum ada produk di keranjang Anda
              </p>
              <Button onClick={() => router.push("/products")}>
                Mulai Belanja
              </Button>
            </div>
          ) : (
            Array.isArray(cartData) ? (
              cartData.map((item: Cart, index: number) => (
                <React.Fragment key={item.id}>
                  <CartItem
                    id={item.id}
                    quantity={item.quantity}
                    size={item.size}
                    image={item.image}
                    title={item.name}
                    price={item.price}
                    availability={item.availability}
                    deleteCart={handleDeleteCart}
                    handleChangeQuantity={handleChangeQuantity}
                  />
                  {index !== cartData.length - 1 && <Separator />}
                </React.Fragment>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>Belum ada item di keranjang</p>
              </div>
            )
          )}
        </div>
        {/* Ringkasan Harga */}
        <div className="w-full md:max-w-80 lg:max-w-96 space-y-4">
          <h4 className="font-semibold">Detail Harga</h4>
          <div className="bg-gray-100 rounded-md p-4 text-sm">
            <h6 className="font-medium">{totalItems} produk</h6>
            {Array.isArray(cartData) && cartData.length > 0 ? (
              <>
                <div className="space-y-2 py-2">
                  {cartData.map((item: Cart) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center"
                    >
                      <span>
                        {" "}
                        <span>{item.quantity} x</span> {item.name}
                      </span>
                      <span>{formatRupiah(item.price)}</span>
                    </div>
                  ))}
                </div>
                <Separator className="my-2" />
                {/* Total */}
                <div className="flex justify-between items-center font-medium">
                  <h6 className="pt-3">Total bayar</h6>
                  <span>{formatRupiah(totalAmount || 0)}</span>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>Belum ada item di keranjang</p>
              </div>
            )}
          </div>
          <Button
            onClick={() => router.push("/checkout")}
            size={"lg"}
            className="w-full"
            disabled={!Array.isArray(cartData) || cartData.length === 0}
          >
            Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
