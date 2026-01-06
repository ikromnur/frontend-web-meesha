import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!BACKEND_URL) {
      return NextResponse.json(
        { message: "BACKEND_URL tidak terkonfigurasi" },
        { status: 500 }
      );
    }

    const token = await getToken({
      req: req as any,
      secret: process.env.NEXTAUTH_SECRET,
    }).catch(() => null);

    if (!token?.accessToken) {
      return NextResponse.json(
        { message: "Unauthorized: token tidak tersedia" },
        { status: 401 }
      );
    }

    const role = String((token as any)?.user?.role || (token as any)?.role || "").toLowerCase();
    const isAdmin = role === "admin" || role === "superadmin";
    if (!isAdmin) {
      return NextResponse.json(
        { message: "Forbidden: hanya admin yang dapat kirim ulang invoice" },
        { status: 403 }
      );
    }

    const orderId = params.id;

    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token.accessToken}`,
    };

    const candidates = [
      `${BACKEND_URL}/api/v1/orders/${encodeURIComponent(orderId)}/invoice/resend`,
      `${BACKEND_URL}/orders/${encodeURIComponent(orderId)}/invoice/resend`,
    ];

    let lastError: Error | null = null;
    for (const url of candidates) {
      try {
        const res = await fetch(url, { method: "POST", headers: baseHeaders });
        const json = await res
          .json()
          .catch(() => ({ success: res.ok, message: `Status ${res.status}` }));
        if (res.ok) {
          // Backend diharapkan mengembalikan { success: true }
          return NextResponse.json(json, { status: 200 });
        }
        lastError = new Error(
          json?.message || `Resend endpoint ${url} gagal dengan status ${res.status}`
        );
      } catch (err) {
        lastError = err as Error;
      }
    }

    return NextResponse.json(
      {
        message:
          "Gagal mengirim ulang invoice PDF. Pastikan order telah dibayar dan endpoint tersedia.",
        error: lastError?.message,
      },
      { status: 502 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Terjadi kesalahan saat memproses permintaan resend invoice.",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

