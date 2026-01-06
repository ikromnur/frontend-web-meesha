import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import axios, { AxiosError } from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

function getCandidatePaths(): string[] {
  const pathsEnv = process.env.ORDERS_USER_PATHS;
  const pathEnv = process.env.ORDERS_USER_PATH;
  if (pathsEnv) {
    return pathsEnv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (pathEnv) {
    return [pathEnv];
  }
  return [
    "/api/orders",
    "/api/user/orders",
    "/orders/me",
    "/user/orders",
    "/orders",
  ];
}

export async function GET(request: NextRequest) {
  try {
    // Terima token dari NextAuth ATAU header Authorization (lokalStorage)
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }).catch(() => null);
    const bearer = token?.accessToken
      ? `Bearer ${token.accessToken}`
      : request.headers.get("authorization") || "";

    if (!bearer) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "all";
    const search = url.searchParams.get("search") || undefined;
    const date = url.searchParams.get("date") || undefined;

    const candidates = getCandidatePaths();

    // Coba setiap kandidat secara berurutan; stop pada sukses 200
    for (const candidate of candidates) {
      try {
        const endpoint = `${BACKEND_URL}${candidate}`;
        const response = await axios.get(endpoint, {
          headers: {
            Authorization: bearer,
            "Content-Type": "application/json",
          },
          params: { status, search, date },
        });
        // Jika berhasil, teruskan payload apa adanya agar client bisa menormalkan
        return NextResponse.json(response.data, { status: 200 });
      } catch (err) {
        const ax = err as AxiosError<any>;
        const code = ax.response?.status;
        // 404/405: coba kandidat berikutnya
        if (code === 404 || code === 405) {
          continue;
        }
        // 401/403: propagasi agar UI tahu masalah izin
        if (code === 401 || code === 403) {
          return NextResponse.json(
            { success: false, message: ax.response?.data?.message || "Unauthorized" },
            { status: code }
          );
        }
        // Jika error lain (mis. 5xx), lanjutkan ke kandidat berikut; jika semua gagal di bawah
        continue;
      }
    }

    // Tidak ada kandidat yang berhasil: kembalikan data kosong agar UI tidak error
    return NextResponse.json({ success: true, data: [] }, { status: 200 });
  } catch (error) {
    const axiosError = error as AxiosError<any>;
    if (axiosError.code === "ECONNREFUSED") {
      return NextResponse.json(
        { success: false, message: "Backend server is not running" },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { success: false, message: axiosError.message || "Failed to fetch orders" },
      { status: axiosError.response?.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }).catch(() => null);
    const bearer = token?.accessToken
      ? `Bearer ${token.accessToken}`
      : request.headers.get("authorization") || "";

    if (!bearer) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    // Default endpoint for creating order is /api/orders
    const endpoint = `${BACKEND_URL}/api/orders`;

    const response = await axios.post(endpoint, body, {
      headers: {
        Authorization: bearer,
        "Content-Type": "application/json",
      },
    });

    return NextResponse.json(response.data, { status: 201 });
  } catch (error) {
    const axiosError = error as AxiosError<any>;
    console.error("[POST /orders] Error:", axiosError.message, axiosError.response?.data);
    
    if (axiosError.code === "ECONNREFUSED") {
      return NextResponse.json(
        { success: false, message: "Backend server is not running" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: axiosError.response?.data?.message || axiosError.message || "Failed to create order",
        ...axiosError.response?.data // Include full error details if available
      },
      { status: axiosError.response?.status || 500 }
    );
  }
}
