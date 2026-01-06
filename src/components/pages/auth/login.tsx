"use client";

import React, { useState } from "react";
import Image from "next/image";
import banner from "../../../../public/benner.png";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginFormSchema, loginFormSchema } from "@/features/auth/form/login";
import LoginForm from "@/features/auth/components/login-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { getSession } from "next-auth/react";
import { axiosInstance } from "@/lib/axios";

const LoginPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormSchema>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleLogin = async (data: LoginFormSchema) => {
    setIsLoading(true);

    // Preflight ke API login untuk membedakan kasus "belum verifikasi" vs kredensial salah
    try {
      const preflight = await axiosInstance.post("/auth/login", {
        email: data.email,
        password: data.password,
      });

      // Jika berhasil dan akun terverifikasi, lanjutkan create session via NextAuth
      const payload = preflight.data?.data ?? preflight.data;
      const isVerified = payload?.isVerified ?? payload?.is_verified ?? true;
      if (!isVerified) {
        toast({
          title: "Akun belum terverifikasi",
          description:
            "Silakan cek email Anda dan verifikasi dengan kode OTP.",
          variant: "destructive",
        });
        router.push(
          `/otp-verification?email=${encodeURIComponent(
            data.email,
          )}&purpose=register&next=/login&auto=1`,
        );
        setIsLoading(false);
        return;
      }

      // Verified → sekarang buat sesi dengan NextAuth
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (result?.error) {
        console.log("Login failed:", result.error);
        if (result.error.startsWith("USER_NOT_VERIFIED")) {
          toast({
            title: "Akun belum terverifikasi",
            description:
              "Silakan cek OTP dan verifikasi akun terlebih dahulu.",
            variant: "destructive",
          });
          const emailFromError =
            result.error.split(":")[1] || form.getValues("email");
          router.push(
            `/otp-verification?email=${encodeURIComponent(
              emailFromError,
            )}&purpose=register&next=/login&auto=1`,
          );
        } else {
          toast({
            title: "Gagal login",
            description: "Email atau password salah",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Berhasil",
          description: "Login successfully",
        });

        const updatedSession = await getSession();

        if (updatedSession?.user?.role === "ADMIN") {
          router.push("/dashboard");
        } else {
          router.push("/");
        }

        form.reset();
      }
    } catch (error: any) {
      // Tangani error dari preflight: bedakan belum verifikasi vs salah kredensial
      if (error?.response?.status === 403) {
        const msg = error?.response?.data?.message?.toLowerCase?.() || "";
        if (msg.includes("not verified") || msg.includes("belum verifikasi")) {
          toast({
            title: "Akun belum terverifikasi",
            description:
              "Silakan cek email dan lakukan verifikasi OTP terlebih dahulu.",
            variant: "destructive",
          });
          router.push(
            `/otp-verification?email=${encodeURIComponent(
              data.email,
            )}&purpose=register&next=/login`,
          );
          setIsLoading(false);
          return;
        }
      }

      toast({
        title: "Gagal login",
        description: "Email atau password salah",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 w-full h-screen bg-red-50">
      {/* Form */}
      <section className="flex items-center justify-center flex-col max-w-xl h-screen md:h-auto w-full px-4 place-self-center ">
        <div className="max-w-sm w-full md:max-w-72 lg:max-w-96">
          <h1 className="text-2xl font-bold w-full mb-4">Masuk</h1>
          <FormProvider {...form}>
            <LoginForm onLogin={handleLogin} loginLoading={isLoading} />
          </FormProvider>
        </div>
        <p className="text-center text-sm mt-4">
          Belum punya akun?{" "}
          <Link href="/register" className="font-bold">
            Buat Akun
          </Link>
        </p>
      </section>

      {/* Banner */}
      <section className="order-1 md:order-2 relative hidden md:block">
        <Image
          src={banner}
          className="w-full h-screen object-cover"
          width={1000}
          height={1000}
          priority
          alt="banner"
        />
      </section>
    </div>
  );
};

export default LoginPage;
