"use client";

import Image from "next/image";
import React from "react";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

const NotFoundPage = () => {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center bg-white">
      <div className="max-w-md w-full space-y-6">
      <div className="relative w-full h-64">
        <Image
          src="/404-illustration.svg"
          alt="404 Illustration"
          fill
          className="object-contain"
          priority
        />
      </div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Oops! Page Not Found
        </h1>
        <p className="text-gray-600">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button size={"lg"} onClick={() => router.push("/")}>
          Return to Homepage
        </Button>
      </div>
    </main>
  );
};

export default NotFoundPage;
