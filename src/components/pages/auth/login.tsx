"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import banner from "../../../../public/benner.png";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginFormSchema, loginFormSchema } from "@/features/auth/form/login";
import LoginForm from "@/features/auth/components/login-form";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { getSession } from "next-auth/react";

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormSchema>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      toast({
        title: "Gagal Login",
        description: "Email atau password yang Anda masukkan salah. Silakan coba lagi.",
        variant: "destructive",
      });
      // Hapus parameter error dari URL agar tidak muncul lagi saat refresh
      router.replace("/login", { scroll: false });
    }
  }, [searchParams, router, toast]);

  const handleLogin = async (data: LoginFormSchema) => {
    setIsLoading(true);

    const result = await signIn("credentials", {
      redirect: false, // Penting: jangan redirect otomatis
      email: data.email,
      password: data.password,
    });

    if (result?.error) {
      // Error sudah ditangani oleh useEffect di atas,
      // yang akan membaca dari URL setelah NextAuth redirect.
      // Cukup hentikan loading.
      setIsLoading(false);
    } else if (result?.ok) {
      // Jika login berhasil
      toast({
        title: "Berhasil",
        description: "Login berhasil!",
      });

      const updatedSession = await getSession();

      if (updatedSession?.user?.role === "ADMIN") {
        router.push("/dashboard");
      } else {
        router.push("/");
      }

      form.reset();
    }

    // setIsLoading(false) dipindahkan ke dalam blok if/else
    // agar tidak tereksekusi jika sudah redirect
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

