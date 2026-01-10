import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:4000";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    }).catch(() => null);

    const searchParams = req.nextUrl.searchParams;
    const dateParam = searchParams.get("date");

    // Forward all parameters including date, status, search, etc.
    // Backend handles date filtering now.
    const qs = new URLSearchParams();
    searchParams.forEach((value, key) => {
      qs.append(key, value);
    });

    // Use /api/v1/admin/orders for Admin Dashboard
    // Previously: /api/v1/orders (User endpoint) which caused empty lists for admins
    const url = `${BACKEND_URL}/api/v1/admin/orders${
      qs.toString() ? `?${qs.toString()}` : ""
    }`;

    console.log(`[Proxy GET] Forwarding to: ${url}`);

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
      console.error(`[Proxy GET] Backend error ${res.status}:`, json);
      return NextResponse.json(
        {
          success: false,
          // Handle backend error structure { error: { message: ... } } or { message: ... }
          message:
            json?.error?.message ||
            json?.message ||
            "Gagal mengambil data pesanan dari backend",
          backendError: json,
        },
        { status: res.status || 500 }
      );
    }

    // Backend returns { data: [...] }
    const data = json.data || [];

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("[Proxy GET] Internal Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error", error },
      { status: 500 }
    );
  }
}
