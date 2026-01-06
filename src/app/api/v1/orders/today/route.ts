import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

// GET /api/v1/orders/today?status=...
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") || undefined;

    // Forward query ke backend
    const qs = new URLSearchParams();
    if (status && status !== "all") qs.append("status", status);

    const url = `${BACKEND_URL}/api/v1/orders/today${
      qs.toString() ? `?${qs.toString()}` : ""
    }`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token?.accessToken
          ? { Authorization: `Bearer ${token.accessToken}` }
          : {}),
      },
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          message: json?.message || "Gagal mengambil pesanan hari ini",
          ...json,
        },
        { status: res.status || 500 },
      );
    }

    // Normalisasi response menjadi { data: Array }
    const data =
      Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("[Proxy v1/orders/today] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error", error },
      { status: 500 },
    );
  }
}