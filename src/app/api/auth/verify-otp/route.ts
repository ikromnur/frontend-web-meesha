import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp, purpose } = body as { email?: string; otp?: string; purpose?: string };

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: "Email dan OTP wajib diisi" },
        { status: 400 },
      );
    }

    // Batasi tujuan verifikasi OTP
    const allowedPurposes = ["register", "change-password", "forgot-password"] as const;
    const normalizedPurpose = (purpose || "").toLowerCase();
    if (!allowedPurposes.includes(normalizedPurpose as any)) {
      return NextResponse.json(
        { success: false, message: "Verifikasi OTP hanya untuk pendaftaran, ganti password, dan lupa password" },
        { status: 400 },
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/v1/auth/verify-otp`,
        { email, otp, purpose: normalizedPurpose },
        { headers: { "Content-Type": "application/json" } },
      );
      return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
      const message = error?.response?.data?.message || "OTP tidak valid atau sudah kedaluwarsa";
      const status = error?.response?.status || 401;
      return NextResponse.json(
        { success: false, message },
        { status },
      );
    }
  } catch (e) {
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan pada server" },
      { status: 500 },
    );
  }
}