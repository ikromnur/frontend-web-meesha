import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Proxy endpoint untuk menerima POST callback dari Tripay
// Konfigurasikan URL callback di Dashboard Tripay ke
//   https://<domain-frontend>/api/payments/tripay/callback
// Endpoint ini akan meneruskan payload ke backend Anda.

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export async function POST(req: NextRequest) {
  try {
    // Tripay signature verification pada backend biasanya membutuhkan raw body string
    const raw = await req.text();
    const sig =
      req.headers.get("x-callback-signature") ||
      req.headers.get("X-Callback-Signature") ||
      "";
    const evt =
      req.headers.get("x-callback-event") ||
      req.headers.get("X-Callback-Event") ||
      "";

    const res = await fetch(`${BACKEND_URL}/payments/tripay/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sig ? { "X-Callback-Signature": sig } : {}),
        ...(evt ? { "X-Callback-Event": evt } : {}),
      },
      body: raw,
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json(
          {
            success: false,
            message: json?.message || "Callback gagal",
            ...json,
          },
          { status: res.status || 500 }
        );
      }
      return NextResponse.json(
        { success: true, data: json?.data ?? json },
        { status: 200 }
      );
    }
    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: res.headers });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
        error: String(error),
      },
      { status: 500 }
    );
  }
}

// Health-check GET untuk memverifikasi endpoint dapat diakses publik
export async function GET() {
  return NextResponse.json(
    { success: true, message: "Tripay callback endpoint is reachable" },
    { status: 200 }
  );
}
