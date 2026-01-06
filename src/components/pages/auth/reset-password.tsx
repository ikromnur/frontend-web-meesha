"use client";

import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  resetPasswordSchema,
  ResetPasswordSchema,
} from "@/schemas/forgot-password";
import { useResetPassword } from "@/features/forgot-password/api/use-reset-password";
import ResetPasswordForm from "@/features/forgot-password/components/reset-password-form";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import logo from "../../../../public/logomeeshatext.svg";
import axios from "axios";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const ResetPasswordPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const otp = searchParams.get("otp");

  const form = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: email || "",
      otp: otp || "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Redirect to forgot-password if no email provided
  useEffect(() => {
    if (!email) {
      toast({
        title: "Perhatian",
        description: "Silakan mulai dari halaman Lupa Password.",
        variant: "destructive",
      });
      router.push("/forgot-password");
    }
  }, [email, router, toast]);

  const { mutate: resetPassword, isPending: isLoading } = useResetPassword({
    onSuccess: () => {
      toast({
        title: "Berhasil!",
        description:
          "Password berhasil diubah! Silakan login dengan password baru Anda.",
      });
      // Navigate to login page
      router.push("/login");
    },
    onError: (error) => {
      let errorMessage = "Gagal mereset password. Silakan coba lagi.";

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          errorMessage = error.response?.data?.message || "Input tidak valid.";
        } else if (error.response?.status === 401) {
          errorMessage = "Akses tidak diizinkan.";
        } else if (error.response?.status === 404) {
          errorMessage = "Email tidak ditemukan.";
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
      }

      toast({
        title: "Error!",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleResetPassword = (data: ResetPasswordSchema) => {
    resetPassword(data);
  };

  const handleGoToOtp = async () => {
    if (!email) {
      toast({
        title: "Perhatian",
        description: "Email wajib diisi sebelum verifikasi OTP",
        variant: "destructive",
      });
      return;
    }
    try {
      const { data } = await axios.post("/api/auth/check-email", { email });
      if (data?.success) {
        router.push(
          `/otp-verification?email=${encodeURIComponent(
            email
          )}&purpose=forgot-password&next=${encodeURIComponent(
            `/reset-password?email=${encodeURIComponent(email)}`
          )}`
        );
      } else {
        toast({
          title: "Email tidak ditemukan",
          description: data?.message || "Email tidak dikenali oleh backend",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Gagal memeriksa email. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  };

  // Show loading while checking email
  if (!email) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 to-white p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src={logo}
            alt="Meesha Logo"
            width={200}
            height={100}
            priority
            className="w-[195.45px] h-auto"
          />
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Title & Description */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Reset Password Anda
            </h1>
            <p className="text-sm text-gray-600 mb-4">
              Masukkan password baru Anda.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-xs text-blue-800">
                Email: <br />
                <span className="font-semibold">{email}</span>
              </p>
            </div>
          </div>

          {/* Form */}
          <Form {...form}>
            <ResetPasswordForm
              onSubmit={handleResetPassword}
              isLoading={isLoading}
            />
          </Form>

          {/* Tidak ada OTP di halaman ini */}
          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoToOtp}
            >
              Kembali ke verifikasi OTP
            </Button>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Ingat password Anda?{" "}
          <span
            onClick={() => router.push("/login")}
            className="text-primary hover:underline cursor-pointer font-medium"
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
