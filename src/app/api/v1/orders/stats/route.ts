import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    }).catch(() => null);

    const searchParams = req.nextUrl.searchParams;
    const qs = new URLSearchParams();
    searchParams.forEach((value, key) => {
      qs.append(key, value);
    });

    // Backend endpoint: /api/admin/orders/stats
    const url = `${BACKEND_URL}/api/admin/orders/stats${
      qs.toString() ? `?${qs.toString()}` : ""
    }`;

    console.log(`[Proxy Stats GET] Forwarding to: ${url}`);

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

    const contentType = res.headers.get("content-type") || "";
    const json = contentType.includes("application/json")
      ? await res.json().catch(() => ({}))
      : {};

    if (!res.ok) {
      console.error(`[Proxy Stats GET] Backend error ${res.status}:`, json);
      return NextResponse.json(
        {
          success: false,
          message:
            json?.error?.message ||
            json?.message ||
            "Gagal mengambil statistik pesanan",
          backendError: json,
        },
        { status: res.status || 500 }
      );
    }

    return NextResponse.json(json, { status: 200 });
  } catch (error) {
    console.error("[Proxy Stats GET] Internal Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error", error },
      { status: 500 }
    );
  }
}
