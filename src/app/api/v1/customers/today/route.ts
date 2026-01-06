import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

// GET /api/v1/customers/today — daftar pelanggan baru hari ini
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const url = `${BACKEND_URL}/api/v1/customers/today`;

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
          message: json?.message || "Gagal mengambil pelanggan baru hari ini",
          ...json,
        },
        { status: res.status || 500 },
      );
    }

    // Pastikan avatarUrl absolut jika backend kirim path relatif
    const data: Array<{
      id: string;
      username: string;
      email: string;
      noHp: string;
      avatarUrl: string | null;
    }> = Array.isArray(json) ? json : json?.data ?? [];

    const normalized = data.map((c) => {
      let avatarUrl = c.avatarUrl;
      if (avatarUrl && typeof avatarUrl === "string" && !/^https?:\/\//.test(avatarUrl)) {
        const needsSlash = !avatarUrl.startsWith("/");
        avatarUrl = `${BACKEND_URL}${needsSlash ? "/" : ""}${avatarUrl}`;
      }
      return { ...c, avatarUrl };
    });

    return NextResponse.json({ data: normalized }, { status: 200 });
  } catch (error) {
    console.error("[Proxy v1/customers/today] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error", error },
      { status: 500 },
    );
  }
}