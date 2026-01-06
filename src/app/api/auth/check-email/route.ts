import { NextResponse } from "next/server";
import { isEmailRegistered } from "@/lib/storage/otp-storage";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body as { email?: string };

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email wajib diisi" },
        { status: 400 },
      );
    }

    const exists = isEmailRegistered(email);
    if (!exists) {
      return NextResponse.json(
        { success: false, message: "Email tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, message: "Email terdaftar", data: { email } },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan pada server" },
      { status: 500 },
    );
  }
}