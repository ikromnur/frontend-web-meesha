import React, { Suspense } from "react";
import LoginPage from "@/components/pages/auth/login";

export const metadata = {
  title: "Login",
};

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPage />
    </Suspense>
  );
}
