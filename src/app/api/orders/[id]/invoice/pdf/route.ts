import { NextResponse } from "next/server";

// Alias route: /api/orders/:id/invoice/pdf → redirect ke /api/orders/:id/invoice/download
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const current = new URL(req.url);
    const target = new URL(
      `/api/orders/${encodeURIComponent(params.id)}/invoice/download`,
      current.origin
    );
    return NextResponse.redirect(target, { status: 307 });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Gagal mengalihkan ke endpoint unduhan invoice.",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

