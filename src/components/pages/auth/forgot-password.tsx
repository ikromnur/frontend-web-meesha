"use client";

import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestOtpSchema, RequestOtpSchema } from "@/schemas/forgot-password";
import { useRequestOtp } from "@/features/forgot-password/api/use-request-otp";
import RequestOtpForm from "@/features/forgot-password/components/request-otp-form";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import logo from "../../../../public/logomeeshatext.svg";
import axios from "axios";
import { useEffect, useState } from "react";

const ForgotPasswordPage = () => {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<RequestOtpSchema>({
    resolver: zodResolver(requestOtpSchema),
    defaultValues: {
      email: "",
    },
  });

  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [emailForResend, setEmailForResend] = useState<string | null>(null);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const cooldownMs = 120000; // 2 menit
  const remainingMs = lastSentAt
    ? Math.max(0, cooldownMs - (now - lastSentAt))
    : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const canResend = !lastSentAt || Date.now() - lastSentAt >= cooldownMs;

  const { mutate: requestOtp, isPending: isLoading } = useRequestOtp({
    onSuccess: (email) => {
      toast({
        title: "Berhasil!",
        description: "Kode OTP telah dikirim ke email Anda.",
      });
      setLastSentAt(Date.now());
      setEmailForResend(email);
      // Navigate to OTP verification page with purpose 'forgot-password'
      router.push(
        `/otp-verification?email=${encodeURIComponent(
          email
        )}&purpose=forgot-password&next=${encodeURIComponent(
          `/reset-password?email=${encodeURIComponent(email)}`
        )}`
      );
    },
    onError: (error) => {
      let errorMessage = "Gagal mengirim kode OTP. Silakan coba lagi.";

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          errorMessage = "Email tidak terdaftar. Silakan periksa kembali.";
        } else if (error.response?.status === 400) {
          errorMessage = error.response?.data?.message || "Email tidak valid.";
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }

      toast({
        title: "Error!",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleRequestOtp = (data: RequestOtpSchema) => {
    requestOtp(data);
  };

  const handleResendOtp = async () => {
    const currentEmail = emailForResend ?? form.getValues("email");
    if (!currentEmail) {
      toast({
        title: "Perhatian",
        description: "Silakan masukkan email terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    if (!canResend) return;

    try {
      setResendLoading(true);
      requestOtp({ email: currentEmail });
      setLastSentAt(Date.now());
    } finally {
      setResendLoading(false);
    }
  };

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
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          {/* Title & Description */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Lupa Password Anda?
            </h1>
            <p className="text-sm text-gray-600">
              Jangan khawatir! Masukkan email Anda dan kami akan kirimkan kode
              OTP untuk reset password.
            </p>
          </div>

          {/* Form */}
          <Form {...form}>
            <RequestOtpForm onSubmit={handleRequestOtp} isLoading={isLoading} />
          </Form>

          {/* Resend OTP */}
          <div className="text-center mt-6 border-t pt-4">
            <p className="text-sm text-gray-600 mb-2">Tidak menerima kode?</p>
            <button
              className="text-primary text-sm font-medium hover:underline disabled:opacity-50"
              onClick={handleResendOtp}
              disabled={!canResend || resendLoading}
            >
              {resendLoading
                ? "Mengirim ulang..."
                : canResend
                ? "Kirim ulang kode OTP"
                : `Kirim ulang dalam ${Math.floor(
                    remainingSeconds / 60
                  )}:${String(remainingSeconds % 60).padStart(2, "0")}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
