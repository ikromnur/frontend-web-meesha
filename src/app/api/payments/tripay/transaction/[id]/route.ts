import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

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

    const pathUrl = `${BACKEND_URL}/api/payments/tripay/transaction/${encodeURIComponent(
      params.id
    )}`;

    let res = await fetch(pathUrl, {
      method: "GET",
      headers: baseHeaders,
      cache: "no-store",
    });

    // 304 Not Modified: propagate directly without body
    if (res.status === 304) {
      const headers: Record<string, string> = {};
      const cc = res.headers.get("cache-control");
      const etag = res.headers.get("etag");
      const lm = res.headers.get("last-modified");
      if (cc) headers["Cache-Control"] = cc;
      if (etag) headers["ETag"] = etag;
      if (lm) headers["Last-Modified"] = lm;
      return new NextResponse(null, { status: 304, headers });
    }

    let json = await res.json().catch(() => ({}));
    // Fallback kompatibilitas: bila backend masih butuh query ?reference=
    if (
      !res.ok &&
      /Undefined\s*parameter\s*:\s*reference/i.test(String(json?.message))
    ) {
      const qsUrl = `${BACKEND_URL}/api/payments/tripay/transaction?reference=${encodeURIComponent(
        params.id
      )}`;
      res = await fetch(qsUrl, {
        method: "GET",
        headers: baseHeaders,
        cache: "no-store",
      });
      json = await res.json().catch(() => ({}));
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          message: json?.message || "Gagal mengambil status transaksi",
          ...json,
        },
        { status: res.status || 500 }
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
