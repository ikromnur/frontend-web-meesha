import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";

// Forward-only: gunakan backend untuk mengambil channel Tripay
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:4000";

// GET /api/v1/payments/tripay/channels?code=QRIS
export async function GET(req: NextRequest) {
  try {
    const u = new URL(req.url);
    const code = u.searchParams.get("code");
    const qs = code ? `?code=${encodeURIComponent(code)}` : "";

    // Sertakan token jika ada, namun tidak wajib
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    }).catch(() => null);

    const response = await fetch(
      `${BACKEND_URL}/api/v1/payments/tripay/channels${qs}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token?.accessToken
            ? { Authorization: `Bearer ${token.accessToken}` }
            : {}),
        },
        cache: "no-store",
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || "Gagal memuat channel Tripay", ...data },
        { status: response.status }
      );
    }

    // Mirror payload dari backend apa adanya
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[Tripay Channels] Proxy error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: String(error) },
      { status: 500 }
    );
  }
}
