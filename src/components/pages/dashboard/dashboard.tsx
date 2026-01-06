"use client";

import { useSession } from "next-auth/react";

export default function Dashboard() {
  const { data: session } = useSession();

  if (session?.user.role !== "ADMIN") {
    return <p>Akses ditolak</p>;
  }

  return <p>Selamat datang di dashboard, Admin!</p>;
}


