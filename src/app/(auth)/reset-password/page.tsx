import React from "react";
import ResetPasswordPage from "@/components/pages/auth/reset-password";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Reset Password",
};

export default function Page() {
  return <ResetPasswordPage />;
}
