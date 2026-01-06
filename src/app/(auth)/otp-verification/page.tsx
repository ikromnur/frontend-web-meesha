import React from "react";
import OtpVerificationPage from "@/components/pages/auth/otp-verification";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Verifikasi OTP - Meesha",
};

export default function Page() {
  return <OtpVerificationPage />;
}