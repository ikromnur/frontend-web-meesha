"use client";

import React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import {
  changePasswordSchema,
  ChangePasswordFormValues,
} from "@/features/dashboard-settings/schemas/password-schema";
import ChangePasswordForm from "@/features/dashboard-settings/components/change-password-form";
import { isAxiosError } from "axios";
import { axiosInstance } from "@/lib/axios";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const DashboardSettingsPage = () => {
  const { toast } = useToast();
  const router = useRouter();
  const { data: session } = useSession();

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const isPending = false;

  const onSubmit = async (_data: ChangePasswordFormValues) => {
    const email = session?.user?.email;
    if (!email) {
      toast({
        title: "Tidak dapat mengirim OTP",
        description: "Email akun tidak ditemukan dalam sesi.",
        variant: "destructive",
      });
      return;
    }

    try {
      await axiosInstance.post("/auth/request-otp", { email, purpose: "change-password" });
      toast({
        title: "OTP dikirim",
        description: "Silakan verifikasi OTP yang dikirim ke email Anda.",
      });
      router.push(`/otp-verification?email=${encodeURIComponent(email)}&purpose=change-password&next=${encodeURIComponent(`/reset-password?email=${encodeURIComponent(email)}`)}`);
    } catch (error) {
      const message = isAxiosError(error)
        ? error.response?.data?.message || "Gagal mengirim OTP"
        : "Terjadi kesalahan saat mengirim OTP";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pengaturan Keamanan</h1>
        <p className="text-gray-600">
          Kelola keamanan akun Anda dengan mengubah password secara berkala
        </p>
      </div>

      <FormProvider {...form}>
        <ChangePasswordForm onSubmit={onSubmit} isLoading={isPending} />
      </FormProvider>
    </div>
  );
};

export default DashboardSettingsPage;
