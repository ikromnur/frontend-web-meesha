import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:4000";

// GET /api/payments/tripay/transaction/:id -> proxy ke backend untuk mengambil detail/status transaksi Tripay
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    }).catch(() => null);
    const bearer = token?.accessToken
      ? `Bearer ${token.accessToken}`
      : req.headers.get("authorization") || "";
    const ifNoneMatch =
      req.headers.get("if-none-match") || req.headers.get("If-None-Match");
    const ifModifiedSince =
      req.headers.get("if-modified-since") ||
      req.headers.get("If-Modified-Since");
    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(bearer ? { Authorization: bearer } : {}),
      ...(ifNoneMatch ? { "If-None-Match": ifNoneMatch } : {}),
      ...(ifModifiedSince ? { "If-Modified-Since": ifModifiedSince } : {}),
    };

    const encodedId = encodeURIComponent(params.id);
    const candidates = [
      `${BACKEND_URL}/api/v1/payments/tripay/transaction/${encodedId}`,
      `${BACKEND_URL}/api/v1/payments/tripay/transaction?reference=${encodedId}`,
      `${BACKEND_URL}/api/payments/tripay/transaction/${encodedId}`,
    ];

    let res: Response | null = null;
    let json: any = null;
    let lastError: any = null;

    for (const url of candidates) {
      try {
        const attempt = await fetch(url, {
          method: "GET",
          headers: baseHeaders,
          cache: "no-store",
        });

        if (attempt.status === 304) {
          const headers: Record<string, string> = {};
          const cc = attempt.headers.get("cache-control");
          const etag = attempt.headers.get("etag");
          const lm = attempt.headers.get("last-modified");
          if (cc) headers["Cache-Control"] = cc;
          if (etag) headers["ETag"] = etag;
          if (lm) headers["Last-Modified"] = lm;
          return new NextResponse(null, { status: 304, headers });
        }

        const body = await attempt.json().catch(() => ({}));

        if (attempt.ok) {
          res = attempt;
          json = body;
          break;
        } else {
           // Jika error spesifik "undefined parameter reference", kita lanjut ke candidate berikutnya (yang pakai query)
           // Tapi loop ini sudah mengcovernya.
           lastError = { status: attempt.status, body };
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!res || !json) {
       return NextResponse.json(
        {
          success: false,
          message: lastError?.body?.message || "Gagal mengambil status transaksi (Not Found)",
          ...(lastError?.body || {}),
        },
        { status: lastError?.status || 404 }
      );
    }

    const data = json?.data ?? json;
    return NextResponse.json({ success: true, data }, { status: 200 });
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
export const revalidate = 0;
export const dynamic = "force-dynamic";
