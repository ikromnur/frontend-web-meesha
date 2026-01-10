import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:4000";

export async function GET(
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

    const orderId = params.id;

    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/pdf",
      ...(token?.accessToken
        ? { Authorization: `Bearer ${token.accessToken}` }
        : {}),
    };

    // Kandidat endpoint di backend untuk preview invoice.
    // Sesuai instruksi: gunakan /api/v1/orders/.../invoice
    const candidates = [
      `${BACKEND_URL}/api/v1/orders/${encodeURIComponent(orderId)}/invoice`,
    ];

    let lastError: Error | null = null;

    for (const url of candidates) {
      try {
        const res = await fetch(url, { method: "GET", headers: baseHeaders });
        if (res.ok) {
          const contentType =
            res.headers.get("content-type") || "application/pdf";
          const arrayBuffer = await res.arrayBuffer();
          // Return inline preview
          return new Response(arrayBuffer, {
            status: 200,
            headers: {
              "content-type": contentType,
              // Jangan set content-disposition: attachment; biarkan browser preview
            },
          });
        }
        lastError = new Error(
          `Preview endpoint ${url} mengembalikan status ${res.status}`
        );
      } catch (err) {
        lastError = err as Error;
      }
    }

    return NextResponse.json(
      {
        message:
          "Gagal memuat preview invoice dari backend. Pastikan endpoint invoice tersedia.",
        error: lastError?.message,
      },
      { status: 502 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          "Terjadi kesalahan saat memproses permintaan invoice (preview).",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
