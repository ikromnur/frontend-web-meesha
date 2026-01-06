"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ProgressStepper from "@/components/ui/progress-stepper";
import { Separator } from "@/components/ui/separator";
import { UseGetCart } from "@/features/cart/api/use-get-cart";
import { CartItem } from "@/features/cart/components/card-cart";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Cart } from "@/types/cart";
import { CalendarIcon, Clock } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import clsx from "clsx";
import { FormLabel } from "@/components/ui/form";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { formatRupiah } from "@/helper/format-rupiah";
import { emailSchema, nameSchema, phoneSchema } from "@/schemas/auth";
import { Input } from "@/components/ui/input";
import { UseCreateTransaction } from "@/features/transaction/api/use-create-transaction";
import { useSession } from "next-auth/react";
import UnauthorizePage from "../unauthorize";
import { PaymentMethodSelector } from "@/features/payment/components/payment-method-selector";
import { useCreateTripayClosed } from "@/features/payment/api/use-create-tripay-closed";
import { useRouter } from "next/navigation";
import { Availability } from "@/types/product";

export const transactionSchema = z.object({
  date: z.date({ required_error: "Tanggal harus dipilih" }),
  time: z.string().regex(/^\d{2}:\d{2}$/, { message: "Format harus HH:mm" }),
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
});

export type TransactionSchema = z.infer<typeof transactionSchema>;

const CheckoutPage = () => {
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  const form = useForm<TransactionSchema>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: undefined,
      time: "",
      name: session?.user?.name || "",
      email: session?.user?.email || "",
      phone: session?.user?.phone || "",
    },
  });

  useEffect(() => {
    if (session?.user) {
      form.setValue("name", session.user.name || "");
      form.setValue("email", session.user.email || "");
      form.setValue("phone", session.user.phone || "");
    }
  }, [session, form]);

  const { data: cartData } = UseGetCart({
    onError(e) {
      toast({
        title: "Error",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  // Hitung minimal hari untuk pickup berdasarkan item di keranjang
  const leadDaysForAvailability = (a?: Availability) => {
    switch (a) {
      case Availability.PO_5_DAY:
        return 5;
      case Availability.PO_2_DAY:
        return 2;
      case Availability.READY:
        return 0;
      default:
        return 0;
    }
  };

  const minLeadDays = useMemo(() => {
    const days = (Array.isArray(cartData) ? cartData : []).map((item: Cart) =>
      leadDaysForAvailability(item.availability as Availability)
    );
    return days.length ? Math.max(...days) : 0;
  }, [cartData]);

  const minPickupDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + (isFinite(minLeadDays) ? minLeadDays : 0));
    return d;
  }, [minLeadDays]);

  // Opsi waktu 09:00 sampai 22:00 tiap 10 menit (22:00 batas akhir)
  const timeOptions = useMemo(() => {
    const times: string[] = [];
    for (let h = 9; h <= 22; h++) {
      const maxMinute = h === 22 ? 0 : 50;
      for (let m = 0; m <= maxMinute; m += 10) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        times.push(`${hh}:${mm}`);
      }
    }
    return times;
  }, []);

  const { mutateAsync: createOrderAsync, isPending: transactionLoading } =
    UseCreateTransaction({
      onError(e) {
        toast({
          title: "Error",
          description: e.message,
          variant: "destructive",
        });
      },
    });

  const { mutate: createTripay, isPending: tripayLoading } =
    useCreateTripayClosed({
      onSuccess: (res: any) => {
        // If redirect type
        const checkoutUrl = res?.data?.checkout_url || res?.checkout_url;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }
        const instructions = res?.data?.instructions || res?.instructions;
        const orderIdFromRes = res?.data?.merchant_ref || res?.merchant_ref;
        if (instructions && orderIdFromRes) {
          try {
            sessionStorage.setItem(
              `tripay:instructions:${orderIdFromRes}`,
              JSON.stringify(res?.data || res)
            );
          } catch {}
          router.push(`/orders/${orderIdFromRes}/status`);
          return;
        }
        toast({
          title: "Berhasil",
          description: "Transaksi pembayaran dibuat.",
        });
      },
      onError: (e: unknown) => {
        const message =
          e instanceof Error ? e.message : "Gagal membuat transaksi pembayaran";
        toast({ title: "Error", description: message, variant: "destructive" });
      },
    });

  const onSubmit = async (data: TransactionSchema) => {
    if (!cartData || cartData.length === 0) {
      toast({
        title: "Keranjang kosong",
        description: "Silakan tambahkan produk sebelum checkout.",
        variant: "destructive",
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        title: "Metode belum dipilih",
        description: "Silakan pilih metode pembayaran.",
        variant: "destructive",
      });
      return;
    }

    // Validasi minimal tanggal pickup sesuai item PO
    if (data?.date) {
      const picked = new Date(data.date);
      picked.setHours(0, 0, 0, 0);
      if (picked < minPickupDate) {
        toast({
          title: "Tanggal terlalu cepat",
          description: `Produk PO membutuhkan waktu. Minimal: ${format(
            minPickupDate,
            "PPP"
          )}`,
          variant: "destructive",
        });
        return;
      }
    }

    // Susun payload order sesuai backend
    const orderItems = cartData.map((item: Cart) => ({
      productId: item.product_id ?? item.id,
      quantity: item.quantity,
      price: item.price,
    }));

    const pickupInfo = data?.date
      ? `${format(data.date, "PPP")} ${data.time || ""}`.trim()
      : data.time;

    const orderPayload: any = {
      shippingAddress: pickupInfo
        ? `Pengambilan: ${pickupInfo}`
        : "Pickup - Meesha Store",
      paymentMethod: "TRIPAY",
      orderItems,
    };
    // Sertakan jadwal ambil terstruktur agar tampil di user & admin
    if (data?.date) {
      orderPayload.pickup_date = data.date.toISOString();
    }
    if (data?.time) {
      orderPayload.pickup_time = data.time; // format HH:mm
    }

    try {
      const resp = await createOrderAsync(orderPayload);
      // Ambil id dan totalAmount dari response (sudah dinormalisasi di hook)
      const orderId = resp?.id ?? resp?.orderId;
      const totalAmount = resp?.totalAmount ?? totalPrice;

      if (!orderId) {
        toast({
          title: "Gagal",
          description: "Order ID tidak ditemukan dari backend",
          variant: "destructive",
        });
        return;
      }

      const items = (cartData || []).map((c: Cart) => ({
        name: c.name,
        price: c.price,
        quantity: c.quantity,
      }));
      const returnUrl = process.env.NEXT_PUBLIC_BASE_URL
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/orders/${orderId}/status`
        : undefined;

      // Lanjutkan buat transaksi Tripay (closed)
      createTripay({
        method: paymentMethod,
        amount: Number(totalAmount) || totalPrice,
        orderId: String(orderId),
        customer: {
          name: form.getValues("name") || session?.user?.name || "",
          email: form.getValues("email") || session?.user?.email || "",
          phone: form.getValues("phone") || session?.user?.phone || "",
        },
        items,
        returnUrl,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal membuat order";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  // Tidak lagi menggunakan hour/minute picker; waktu dipilih dari daftar opsi

  const totalPrice =
    cartData?.reduce(
      (acc: number, item: Cart) => acc + item.price * item.quantity,
      0
    ) ?? 0;

  if (!session) {
    return <UnauthorizePage />;
  }

  return (
    <div className="relative w-full max-w-screen-xl mx-auto px-4 py-6">
      <ProgressStepper currentStep={2} className="mb-8" />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 md:grid-cols-2 gap-10"
        >
          <section className="space-y-6">
            <h4 className="font-medium text-xl">Order Summary</h4>
            <div className="flex flex-col gap-4 w-full border rounded-md p-4">
              {cartData?.map((item: Cart, index: number) => (
                <React.Fragment key={item.id}>
                  <CartItem
                    variant="checkout"
                    id={item.id}
                    quantity={item.quantity}
                    size={item.size}
                    image={item.image}
                    title={item.name}
                    price={item.price}
                    availability={item.availability}
                  />
                  {index !== cartData.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 w-full">
              {/* Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collection Date</FormLabel>
                    <FormControl>
                      <Popover open={dateOpen} onOpenChange={setDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Choose date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2 flex flex-col gap-2">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(d) => {
                              if (!d) return;
                              const picked = new Date(d);
                              picked.setHours(0, 0, 0, 0);
                              if (picked < minPickupDate) {
                                toast({
                                  title: "Tanggal terlalu cepat",
                                  description: `Minimal pengambilan: ${format(
                                    minPickupDate,
                                    "PPP"
                                  )}`,
                                  variant: "destructive",
                                });
                                return;
                              }
                              field.onChange(d);
                              setDateOpen(false);
                            }}
                            disabled={(date) => {
                              const dd = new Date(date as Date);
                              dd.setHours(0, 0, 0, 0);
                              return dd < minPickupDate;
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimal: {format(minPickupDate, "PPP")} 09:00
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time */}
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Collection Time</FormLabel>
                    <Popover open={timeOpen} onOpenChange={setTimeOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={clsx(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          {field.value || <span>Choose time</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="grid grid-cols-3 gap-2 p-4 w-[360px] max-h-[240px] overflow-y-auto no-scrollbar">
                        {timeOptions.map((t) => (
                          <Button
                            key={t}
                            type="button"
                            variant={field.value === t ? "default" : "ghost"}
                            className="justify-center"
                            onClick={() => {
                              field.onChange(t);
                              setTimeOpen(false);
                            }}
                          >
                            {t}
                          </Button>
                        ))}
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground mt-1">
                      Jam operasional: 09:00–22:00, interval 10 menit
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm text-[#6C6C6C]">
                <h6 className="font-medium">Subtotal</h6>
                <span>{formatRupiah(totalPrice)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm text-[#6C6C6C]">
                <h6 className="font-medium">Shipping fee</h6>
                <span className="text-[#67CB93] font-semibold">FREE</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm text-[#6C6C6C]">
                <h6 className="font-medium">Total due</h6>
                <span>{formatRupiah(totalPrice)}</span>
              </div>
              <Separator className="my-2" />
              <PaymentMethodSelector
                value={paymentMethod}
                onChange={setPaymentMethod}
              />
            </div>
          </section>
          <section className="flex flex-col space-y-6">
            <h4 className="font-medium text-xl">Contact Detail</h4>
            <div className="space-y-4 p-8 bg-[#FCFCFC] shadow-sm rounded-sm">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Lengkap</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        {...field}
                        placeholder="FZq3P@example.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor HP</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+628123456789" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex items-center gap-3 justify-end">
              <Button
                type="submit"
                disabled={
                  transactionLoading ||
                  tripayLoading ||
                  !paymentMethod ||
                  totalPrice <= 0
                }
                className="w-fit"
                size={"lg"}
              >
                {transactionLoading || tripayLoading
                  ? "Memproses..."
                  : "Lanjutkan"}
              </Button>
            </div>
          </section>
        </form>
      </Form>
    </div>
  );
};

export default CheckoutPage;
