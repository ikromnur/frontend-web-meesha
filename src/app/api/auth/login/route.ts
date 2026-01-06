import axios from "axios";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email dan password wajib diisi" },
        { status: 400 },
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Konfigurasi BACKEND_URL tidak ditemukan. Set NEXT_PUBLIC_BACKEND_URL di .env (contoh: http://localhost:4000)",
        },
        { status: 500 },
      );
    }

    const url = `${backendUrl}/api/auth/login`;

    const res = await axios.post(
      url,
      { email, password },
      {
        headers: { "Content-Type": "application/json" },
      },
    );

    const data = res.data;

    return NextResponse.json(
      {
        success: true,
        message: "Login berhasil",
        data: data.data ?? data,
        token: data.token,
      },
      { status: 200 },
    );
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        {
          success: false,
          message: error.response?.data?.message || "Gagal login",
          error: error.response?.data,
        },
        { status: error.response?.status || 500 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat login",
      },
      { status: 500 },
    );
  }
}