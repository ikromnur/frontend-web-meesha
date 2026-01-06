"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import Image, { StaticImageData } from "next/image";
import { formatRupiah } from "@/helper/format-rupiah";
import { Badge } from "@/components/ui/badge";
import { Availability } from "@/types/product";

interface CartItemProps {
  image: string | StaticImageData;
  title: string;
  price: number;
  id: string;
  quantity: number;
  size: string;
  availability?: Availability | string;
  deleteCart?: (id: string) => void;
  handleChangeQuantity?: (id: string, quantity: number) => void;
  variant?: "cart" | "checkout";
}

export function CartItem({
  id,
  title,
  image,
  price,
  size,
  quantity,
  deleteCart,
  handleChangeQuantity,
  variant = "cart",
  availability,
}: CartItemProps) {
  return (
    <div className="flex gap-4 items-start">
      <div
        className={`w-[20vw] h-auto flex-shrink-0 ${
          variant === "cart"
            ? "max-w-[115px] max-h-[115px]"
            : "max-w-[64px] max-h-[64px]"
        }`}
      >
        <Image
          src={image}
          alt={title}
          width={115}
          height={115}
          className="w-full h-full object-cover aspect-square rounded"
        />
      </div>

      <div className="flex flex-1 flex-col justify-between h-full">
        <div className="flex justify-between items-start">
          <div
            className={`space-y-1 ${
              variant === "checkout" ? "flex items-center gap-2" : ""
            }`}
          >
            <h4 className="font-medium text-base">{title}</h4>
            <Badge variant={"outline"}>{size}</Badge>
            {availability && (
              <Badge
                className={
                  availability === Availability.READY
                    ? "bg-green-600 text-white"
                    : availability === Availability.PO_2_DAY
                    ? "bg-yellow-500 text-black"
                    : availability === Availability.PO_5_DAY
                    ? "bg-orange-500 text-white"
                    : "bg-gray-300 text-gray-900"
                }
              >
                {availability === Availability.READY
                  ? "Ready di toko"
                  : availability === Availability.PO_2_DAY
                  ? "Pre-Order 2 hari"
                  : availability === Availability.PO_5_DAY
                  ? "PO 5 hari"
                  : String(availability)}
              </Badge>
            )}
          </div>

          {variant === "cart" && (
            <Button
              onClick={() => deleteCart?.(id)}
              variant="ghost"
              size="icon"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4 mt-2 justify-between">
          <p className={`font-semibold ${variant === "checkout" && "order-2"}`}>
            {formatRupiah(price)}
          </p>

          {variant === "cart" ? (
            <div className="flex items-center border rounded-md overflow-hidden">
              <Button
                size="sm"
                variant="ghost"
                disabled={quantity === 1}
                onClick={() => handleChangeQuantity?.(id, quantity - 1)}
              >
                –
              </Button>
              <span className="px-3 text-sm">{quantity}</span>
              <Button
                size="sm"
                variant="ghost"
                disabled={quantity === 10}
                onClick={() => handleChangeQuantity?.(id, quantity + 1)}
              >
                +
              </Button>
            </div>
          ) : (
            <span className="text-sm">Qty: {quantity}</span>
          )}
        </div>
      </div>
    </div>
  );
}
