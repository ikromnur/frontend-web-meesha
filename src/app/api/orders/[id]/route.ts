import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:4000";

// Helper: determine if payload attempts to set pickup date/time
function hasPickupMutation(body: any) {
  if (!body || typeof body !== "object") return false;
  return (
    body.pickupAt !== undefined ||
    body.pickup_at !== undefined ||
    body.pickupDate !== undefined ||
    body.pickup_date !== undefined ||
    body.pickupTime !== undefined ||
    body.pickup_time !== undefined
  );
}

// PATCH /api/orders/:id → forward to backend with optional guard for pickupAt
export async function PATCH(
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

    const body = await req.json().catch(() => ({}));

    // Guard: izinkan pemilik + admin mengubah pickupAt secara default; bisa ditoggle via env
    const allowCustomerPickupEdit =
      String(process.env.ALLOW_CUSTOMER_PICKUP_EDIT || "true").toLowerCase() ===
      "true";
    const role = String((token as any)?.role || "").toLowerCase();
    const isAdmin =
      role === "admin" ||
      role === "superadmin" ||
      role === "ADMIN".toLowerCase();

    if (hasPickupMutation(body) && !isAdmin && !allowCustomerPickupEdit) {
      return NextResponse.json(
        {
          success: false,
          message: "Hanya Admin yang dapat mengatur waktu ambil (pickupAt).",
        },
        { status: 403 }
      );
    }

    // Normalize status to uppercase if provided
    const payload = { ...body } as Record<string, any>;
    if (typeof payload.status === "string") {
      payload.status = payload.status.toUpperCase();
    }

    const res = await fetch(`${BACKEND_URL}/api/v1/orders/${params.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(bearer ? { Authorization: bearer } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";
    const json = contentType.includes("application/json")
      ? await res.json().catch(() => ({}))
      : undefined;

    if (!res.ok) {
      const status = res.status || 500;
      const message = json?.message || "Gagal memperbarui pesanan di backend";
      return NextResponse.json(
        { success: false, message, ...(json || {}) },
        { status }
      );
    }

    const normalized = json
      ? "data" in json
        ? json
        : { data: json }
      : { data: null };
    return NextResponse.json(normalized, { status: 200 });
  } catch (error) {
    console.error("[Proxy orders PATCH] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error", error },
      { status: 500 }
    );
  }
}

// GET /api/orders/:id → ambil detail order berdasarkan ID/merchant_ref/order code
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

    const commonHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(bearer ? { Authorization: bearer } : {}),
    };

    // Prioritize /api/v1/orders/[id] which is the correct backend endpoint
    const url = `${BACKEND_URL}/api/v1/orders/${params.id}`;

    console.log(`[Proxy GET Order] Forwarding to: ${url}`);

    const res = await fetch(url, {
      method: "GET",
      headers: commonHeaders,
      cache: "no-store",
    });

    const ct = res.headers.get("content-type") || "";
    const json = ct.includes("application/json")
      ? await res.json().catch(() => ({}))
      : undefined;

    if (!res.ok) {
      console.error(`[Proxy GET Order] Backend Error ${res.status}:`, json);
      return NextResponse.json(
        {
          success: false,
          message: json?.message || "Gagal mengambil detail order",
        },
        { status: res.status }
      );
    }

    // Normalisasi ke { data: order }
    // Backend sudah mengembalikan format { success: true, data: { ... } }
    const payload: any = json;
    const order = payload.data || payload;

    return NextResponse.json({ data: order }, { status: 200 });
  } catch (error) {
    console.error("[Proxy orders/:id GET] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error", error },
      { status: 500 }
    );
  }
}
