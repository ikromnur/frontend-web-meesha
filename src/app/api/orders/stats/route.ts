import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

// GET /api/orders/stats?date=YYYY-MM-DD → proxy ke backend (admin)
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    }).catch(() => null);
    const bearer = token?.accessToken
      ? `Bearer ${token.accessToken}`
      : req.headers.get("authorization") || "";

    const url = new URL(req.url);
    const search = url.search || "";

    const res = await fetch(`${BACKEND_URL}/orders/stats${search}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(bearer ? { Authorization: bearer } : {}),
      },
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";
    const json = contentType.includes("application/json")
      ? await res.json().catch(() => ({}))
      : undefined;

    if (!res.ok) {
      const status = res.status || 500;
      const message = json?.message || "Gagal mengambil statistik pesanan";
      return NextResponse.json(
        { success: false, message, ...(json || {}) },
        { status }
      );
    }

    const normalized = json
      ? "data" in json
        ? json
        : { data: json }
      : { data: null };
    return NextResponse.json(normalized, { status: 200 });
  } catch (error) {
    console.error("[Proxy orders/stats GET] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error", error },
      { status: 500 }
    );
  }
}
