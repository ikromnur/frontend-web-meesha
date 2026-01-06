"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { Input } from "@/components/ui/input";

const OtpVerificationPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Ambil email dari URL parameter
  const email = searchParams.get("email");
  // Dukungan generic: tujuan verifikasi dan halaman berikutnya
  const purpose = (
    searchParams.get("purpose") || "change-password"
  ).toLowerCase();
  const auto = searchParams.get("auto") || "0";
  const nextAfterVerify =
    searchParams.get("next") ||
    (purpose === "register"
      ? "/login"
      : `/reset-password?email=${encodeURIComponent(email || "")}`);
  // Judul halaman berbeda untuk pendaftaran vs lupa password
  const title =
    purpose === "register"
      ? "Verifikasi Akun - Kode OTP"
      : "Password Reset OTP";
  // Konfigurasi: limit percobaan OTP dan lockout, bisa diubah via env.
  const MAX_ATTEMPTS = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_OTP_MAX_ATTEMPTS;
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 5;
  }, []);
  const LOCKOUT_MS = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_OTP_LOCKOUT_MS;
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n >= 0 ? n : 5 * 60 * 1000; // default 5 menit
  }, []);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // State untuk OTP dan percobaan verifikasi
  const [otp, setOtp] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  // Auto-request OTP pada render pertama (dengan guard sessionStorage)
  useEffect(() => {
    const runAutoRequest = async () => {
      if (!email) return;
      if (typeof window === "undefined") return;
      const sentKey = `otp-auto-sent:${email}:${purpose}`;
      if (auto === "1" && !sessionStorage.getItem(sentKey)) {
        try {
          const resp = await axios.post("/api/auth/request-otp", {
            email,
            purpose,
          });
          if (resp?.data?.success !== false) {
            setLastSentAt(Date.now());
            // Reset attempts dan lockout setelah pengiriman otomatis
            setAttempts(0);
            setLockoutUntil(null);
          }
        } catch (e) {
          // Diamkan error; user masih bisa tekan Kirim Ulang
          console.warn("Auto request OTP failed", e);
        } finally {
          sessionStorage.setItem(sentKey, "1");
        }
      }
    };
    runAutoRequest();
  }, [email, purpose, auto]);

  // Verifikasi OTP via backend, jika benar lanjut sesuai tujuan
  const handleVerifyOtp = async () => {
    if (!email) return;
    if (!otp || otp.length !== 6) {
      toast({
        title: "Perhatian",
        description: "Masukkan OTP 6 digit",
        variant: "destructive",
      });
      return;
    }
    if (attempts >= MAX_ATTEMPTS || (lockoutUntil && now < lockoutUntil)) {
      toast({
        title: "Terlalu banyak percobaan",
        description: "Silakan kirim ulang OTP dan coba lagi.",
        variant: "destructive",
      });
      return;
    }

    setVerifyLoading(true);
    try {
      const resp = await axios.post("/api/auth/verify-otp", {
        email,
        otp,
        purpose,
      });
      if (resp?.data?.success) {
        const successMessage =
          purpose === "register"
            ? "OTP terverifikasi. Akun berhasil diaktifkan."
            : "OTP terverifikasi. Lanjut ke reset password.";
        toast({ title: "Berhasil", description: successMessage });

        if (purpose !== "register" && otp) {
          const separator = nextAfterVerify.includes("?") ? "&" : "?";
          router.push(
            `${nextAfterVerify}${separator}otp=${encodeURIComponent(otp)}`
          );
        } else {
          router.push(nextAfterVerify);
        }
      } else {
        setAttempts((a) => a + 1);
        const remaining = MAX_ATTEMPTS - (attempts + 1);
        if (remaining <= 0) {
          setLockoutUntil(Date.now() + LOCKOUT_MS);
        }
        toast({
          title: "OTP salah",
          description:
            remaining > 0
              ? `Kesempatan tersisa: ${remaining}`
              : "Kesempatan habis. Silakan kirim ulang OTP.",
          variant: "destructive",
        });
      }
    } catch {
      setAttempts((a) => a + 1);
      const remaining = MAX_ATTEMPTS - (attempts + 1);
      if (remaining <= 0) {
        setLockoutUntil(Date.now() + LOCKOUT_MS);
      }
      toast({
        title: "Verifikasi gagal",
        description:
          remaining > 0
            ? `Kesempatan tersisa: ${remaining}`
            : "Kesempatan habis. Silakan kirim ulang OTP.",
        variant: "destructive",
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  // Handler untuk kirim ulang OTP
  const cooldownMs = 120000; // 2 menit
  const remainingMs = lastSentAt
    ? Math.max(0, cooldownMs - (now - lastSentAt))
    : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const canResend = !lastSentAt || now - lastSentAt >= cooldownMs;
  const progress = useMemo(() => {
    if (!lastSentAt) return 0;
    const elapsed = now - lastSentAt;
    const p = Math.min(1, Math.max(0, elapsed / cooldownMs));
    return p; // 0..1
  }, [now, lastSentAt]);
  const percentLeft = Math.round((1 - progress) * 100);
  const ringColor = useMemo(() => {
    if (progress > 0.85) return "#ef4444"; // merah saat hampir selesai
    if (progress > 0.6) return "#f59e0b"; // oranye di pertengahan
    return "#3b82f6"; // biru di awal
  }, [progress]);

  const handleResendOtp = async () => {
    if (!email) {
      toast({
        title: "Perhatian",
        description: "Email tidak ditemukan di URL",
        variant: "destructive",
      });
      return;
    }

    if (!canResend) return;

    try {
      setResendLoading(true);
      const resp = await axios.post("/api/auth/request-otp", {
        email,
        purpose,
      });
      if (resp?.data?.success !== false) {
        toast({
          title: "Berhasil!",
          description: "Kode OTP telah dikirim ulang.",
        });
        setLastSentAt(Date.now());
        // Reset attempts dan lockout setelah kirim ulang OTP
        setAttempts(0);
        setLockoutUntil(null);
      } else {
        toast({
          title: "Error!",
          description: resp?.data?.message || "Gagal mengirim ulang OTP",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error!",
        description: "Gagal mengirim ulang OTP",
        variant: "destructive",
      });
    } finally {
      setResendLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              Email tidak ditemukan. Silakan kembali ke halaman{" "}
              {purpose === "register" ? "register" : "ganti password"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() =>
                router.push(
                  purpose === "register" ? "/register" : "/forgot-password"
                )
              }
              className="w-full"
            >
              Kembali
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pastikan email ada di URL.

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {title}
          </CardTitle>
          <CardDescription className="text-center">
            Masukkan kode OTP 6 digit yang dikirim ke
            <br />
            <span className="font-medium text-gray-900">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              type="text"
              inputMode="numeric"
              pattern="\\d{6}"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
              className="text-center text-lg tracking-widest"
              disabled={
                !!(
                  verifyLoading ||
                  attempts >= MAX_ATTEMPTS ||
                  (lockoutUntil && now < lockoutUntil)
                )
              }
            />

            <Button
              className="w-full"
              onClick={handleVerifyOtp}
              disabled={
                !!(
                  verifyLoading ||
                  attempts >= MAX_ATTEMPTS ||
                  (lockoutUntil && now < lockoutUntil)
                )
              }
            >
              {verifyLoading
                ? "Memverifikasi..."
                : attempts >= MAX_ATTEMPTS ||
                  (lockoutUntil && now < lockoutUntil)
                ? "Tunggu atau kirim ulang OTP"
                : "Verifikasi OTP"}
            </Button>
            {attempts > 0 && (
              <p className="text-xs text-center text-gray-600">
                Percobaan salah: {attempts}/{MAX_ATTEMPTS}
              </p>
            )}
            {lockoutUntil && now < lockoutUntil && (
              <p className="text-xs text-center text-red-600">
                Terkunci hingga {Math.ceil((lockoutUntil - now) / 1000)} detik
                lagi
              </p>
            )}
          </div>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">Tidak menerima kode OTP?</p>
            <Button
              variant="link"
              onClick={handleResendOtp}
              className="text-sm"
              disabled={!canResend || resendLoading}
            >
              {resendLoading
                ? "Mengirim ulang..."
                : canResend
                ? "Kirim Ulang OTP"
                : `Kirim ulang dalam ${Math.floor(
                    remainingSeconds / 60
                  )}:${String(remainingSeconds % 60).padStart(2, "0")}`}
            </Button>

            {/* Badge waktu tersisa dan progress ring */}
            {!canResend && (
              <div className="flex items-center justify-center gap-3">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  Sisa waktu {Math.floor(remainingSeconds / 60)}:
                  {String(remainingSeconds % 60).padStart(2, "0")}
                </span>
                <div className="relative w-10 h-10">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 40 40"
                    className="absolute inset-0"
                  >
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="4"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      fill="none"
                      stroke={ringColor}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 18}
                      strokeDashoffset={(1 - progress) * 2 * Math.PI * 18}
                      transform="rotate(-90 20 20)"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700">
                    {percentLeft}%
                  </span>
                </div>
              </div>
            )}

            <div className="pt-4">
              <Button
                variant="ghost"
                onClick={() =>
                  router.push(
                    purpose === "register" ? "/register" : "/forgot-password"
                  )
                }
                className="text-sm"
              >
                {purpose === "register"
                  ? "Kembali ke Register"
                  : "Kembali ke Ganti Password"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OtpVerificationPage;
