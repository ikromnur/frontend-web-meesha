import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;

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

    // Kandidat endpoint invoice di backend.
    // Prioritaskan endpoint baru `/api/invoices/:id`, lalu fallback ke v1 dan yang lama.
    const candidates = [
      `${BACKEND_URL}/api/invoices/${encodeURIComponent(orderId)}`,
      `${BACKEND_URL}/api/v1/orders/${encodeURIComponent(orderId)}/invoice`,
      `${BACKEND_URL}/api/v1/orders/${encodeURIComponent(
        orderId
      )}/invoice/preview`,
      `${BACKEND_URL}/api/orders/${encodeURIComponent(orderId)}/invoice`,
      `${BACKEND_URL}/api/orders/${encodeURIComponent(orderId)}/invoice.pdf`,
    ];

    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/pdf",
      ...(token?.accessToken
        ? { Authorization: `Bearer ${token.accessToken}` }
        : {}),
    };

    let lastError: Error | null = null;

    for (const url of candidates) {
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: baseHeaders,
        });

        if (res.ok) {
          const contentType =
            res.headers.get("content-type") || "application/pdf";
          const arrayBuffer = await res.arrayBuffer();

          // Pertahankan header dari backend apa adanya; jika tidak tersedia, beri default wajar
          // Untuk endpoint unduh, gunakan header backend jika ada,
          // jika tidak ada maka fallback ke attachment agar file terunduh.
          const contentDisposition =
            res.headers.get("content-disposition") ||
            `attachment; filename=invoice-${orderId}.pdf`;

          return new Response(arrayBuffer, {
            status: 200,
            headers: {
              "content-type": contentType,
              "content-disposition": contentDisposition,
            },
          });
        }

        // If response not ok, try next candidate
        lastError = new Error(
          `Invoice endpoint ${url} mengembalikan status ${res.status}`
        );
      } catch (err) {
        lastError = err as Error;
      }
    }

    return NextResponse.json(
      {
        message:
          "Gagal mengambil invoice dari backend. Pastikan endpoint invoice tersedia dan dapat diakses.",
        error: lastError?.message,
      },
      { status: 502 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Terjadi kesalahan saat memproses permintaan invoice.",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
