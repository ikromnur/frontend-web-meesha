"use client";

import { Button } from "@/components/ui/button";
import React from "react";
import { GalleryCollection, SocialMediaSection } from "./home";
import Image from "next/image";
import flower1 from "../../../../public/flower-3.png";
import flower2 from "../../../../public/flower-4.png";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ContactFormValues,
  contactSchema,
} from "@/features/contact/form/contact";
import ContactForm from "@/features/contact/components/contact-form";
import { useRouter } from "next/navigation";
import { UseCreateMessage } from "@/features/contact/api/use-create-message";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

const AboutPage = () => {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
    },
  });

  const { mutate: createMessage, isPending: createMessageLoading } =
    UseCreateMessage({
      onSuccess: () => {
        toast({
          title: "Success",
  description: "Pesan berhasil dikirim",
        });
        form.reset();
      },
      onError: (e: unknown) => {
        if (axios.isAxiosError(e)) {
          toast({
            title: "Error",
            description:
              e.response?.data?.error || "Terjadi kesalahan dari server",
            variant: "destructive",
          });
        } else {
          console.error(e);
          toast({
            title: "Error",
            description: "Terjadi kesalahan yang tidak diketahui",
            variant: "destructive",
          });
        }
      },
    });

  const onSubmit = (values: ContactFormValues) => {
    createMessage(values);
    form.reset();
  };

  return (
    <>
      <div className="w-full max-w-screen-xl mx-auto mt-16 px-4 space-y-5">
        {/* CTA */}
        <section className="text-center py-7 w-full space-y-10">
          <div className="max-w-screen-lg mx-auto space-y-10">
            <h1 className="font-semibold text-[clamp(2rem,3vw,4rem)]">
              Kami menjual Buket Bunga dengan Kreatifitas terbaik
            </h1>
            <p className="font-medium text-lg text-[#9F9F9F] leading-7 ">
              Kami telah membuat berbagai model buket yang cocok dengan segala
              kebutuhan serta budget anda, yang pasti bisa menggunakan bunga
              fresh ataupun artificial. serta keatifitas kami dalam membuat
              buket terus kami perbarui
            </p>
          </div>
          <div className="flex items-center gap-4 justify-center ">
            <Button onClick={() => router.push("/products")} size={"lg"}>
              Pesan Sekarang
            </Button>
            <Button
              onClick={() => router.push("/products")}
              size={"lg"}
              className="bg-[#EC9696]/60"
            >
              Lihat Buket
            </Button>
          </div>
        </section>

        {/* Message */}
        <section className="py-7 md:flex items-center md:justify-between lg:justify-center gap-4 md:gap-8 relative overflow-hidden">
          <div className="space-y-4 md:mt-10">
            <span className="text-primary font-bold">Tim Buket Bunga</span>
            <h2 className="text-3xl font-semibold mb-2 max-w-sm leading-10">
              Kepuasan Utama Kami Adalah Pelanggan.
            </h2>
            <p className="text-[#9F9F9F] lg:max-w-sm leading-7">
              Kami sangat paham akan kebutuhan para pelanggan kami, oleh karna
              itu kami akan memberikan yang terbaik dalam segi kreatifitas
              maupun pelayanan, sehingga para pelanggan akan merasa puas akan
              hasil yang kami berikan
            </p>
          </div>
          <Image
            src={flower1}
            className="rotate-[20deg] top-0 -right-20 opacity-30 -z-10 md:z-0  w-full max-w-60 absolute md:hidden h-auto"
            alt="banner"
          />
          <Image
            src={flower1}
            className="rotate-[20deg] w-full h-auto max-w-96 hidden md:block"
            alt="banner"
          />
        </section>

        {/* Contact */}
        <section className="py-7 lg:max-w-screen-lg mx-auto">
          <h2 className="text-3xl font-semibold mb-4 max-w-sm leading-10 text-end ml-auto">
            Senang mendengar kabar Anda Hubungi kami
          </h2>
          <div className="flex items-center justify-between gap-8 ">
            <Image
              src={flower2}
              alt="banner"
              className="hidden md:block max-w-72 lg:max-w-96  w-full rotate-[340deg]"
            />
            <FormProvider {...form}>
              <ContactForm
                onSubmit={onSubmit}
                isLoading={createMessageLoading}
              />
            </FormProvider>
          </div>
        </section>
      </div>

      {/* Gallery  */}
      <GalleryCollection />

      {/* Social Media */}
      <SocialMediaSection />
    </>
  );
};

export default AboutPage;
