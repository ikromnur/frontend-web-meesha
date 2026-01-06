import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

// GET /api/v1/dashboard/stats — proxy ke backend
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const search = new URL(req.url).search || "";
    const url = `${BACKEND_URL}/api/v1/dashboard/stats${search}`;

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
      const status = res.status || 500;
      return NextResponse.json(
        {
          success: false,
          message:
            json?.message || "Gagal mengambil statistik dashboard dari backend",
          ...json,
        },
        { status },
      );
    }

    // Normalisasi agar frontend menerima { data: ... }
    const normalized = "data" in json ? json : { data: json };
    return NextResponse.json(normalized, { status: 200 });
  } catch (error) {
    console.error("[Proxy v1/stats] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error", error },
      { status: 500 },
    );
  }
}
