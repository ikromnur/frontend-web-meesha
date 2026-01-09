import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.INTERNAL_BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:4000";

// GET /api/carts — forward ke backend database
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    // Jika tidak ada token, jangan return 401 dulu, mungkin user guest (tergantung logic backend).
    // Tapi jika logic backend butuh auth, 401 oke.
    // Asumsi: cart butuh auth.
    if (!token?.accessToken) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // FIX: Gunakan endpoint v1
    const response = await fetch(`${BACKEND_URL}/api/v1/carts`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.accessToken}`,
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || "Gagal mengambil keranjang", ...data },
        { status: response.status }
      );
    }

    // Normalisasi fleksibel: dukung berbagai bentuk payload backend
    const d: any = data;
    const rawItems = Array.isArray(d)
      ? d
      : Array.isArray(d?.data)
      ? d.data
      : Array.isArray(d?.items)
      ? d.items
      : Array.isArray(d?.data?.items)
      ? d.data.items
      : Array.isArray(d?.data?.data)
      ? d.data.data
      : [];

    // Map ke bentuk Cart yang konsisten di frontend
    const items = rawItems.map((item: any) => {
      const product =
        item?.product ||
        item?.product_detail ||
        item?.productData ||
        item?.product_info ||
        {};

      // Normalisasi availability (READY/PO_2_DAY/PO_5_DAY) dari berbagai format
      const normalizeAvailability = (val: any): string | undefined => {
        if (!val) return undefined;
        const enums = ["READY", "PO_2_DAY", "PO_5_DAY"];
        if (enums.includes(String(val))) return String(val);
        const s = String(val).toUpperCase();
        const compact = s.replace(/[^A-Z0-9+]/g, "");
        if (
          (compact.includes("PO") || compact.includes("PREORDER")) &&
          compact.includes("5")
        )
          return "PO_5_DAY";
        if (
          (compact.includes("PO") || compact.includes("PREORDER")) &&
          compact.includes("2")
        )
          return "PO_2_DAY";
        if (compact.includes("READY")) return "READY";
        if (compact.includes("H+5")) return "PO_5_DAY";
        if (compact.includes("H+2")) return "PO_2_DAY";
        return undefined;
      };

      const id = String(
        item?.id ??
          item?.cart_id ??
          item?.uuid ??
          item?._id ??
          item?.cartId ??
          item?.itemId ??
          ""
      );
      const product_id = String(
        item?.product_id ?? item?.productId ?? product?.id ?? product?._id ?? ""
      );
      const quantity = Number(item?.quantity ?? item?.qty ?? 1);
      const size = (item?.size ?? product?.size ?? "").toString();
      const name = String(item?.name ?? product?.name ?? "");
      // Normalisasi gambar: prioritaskan product.imageMain, dukung string, objek {url}, atau array campuran
      const imageCandidates: any[] = [
        product?.imageMain,
        item?.image,
        item?.image?.url,
        item?.imageUrl,
        item?.imageUrl?.url,
        product?.imageUrl,
        product?.imageUrl?.url,
        product?.image,
        product?.image?.url,
      ];
      if (Array.isArray(product?.images) && product.images.length) {
        const first = product.images[0];
        imageCandidates.push(typeof first === "string" ? first : first?.url);
      }
      const image =
        imageCandidates.find((v) => typeof v === "string" && v.length > 0) ||
        "/product-image.png";

      let priceCandidate: any =
        item?.price ?? item?.unit_price ?? product?.price ?? product?.unitPrice;
      let price = Number(priceCandidate);
      if (!isFinite(price)) price = 0;

      // Dukungan angka hari: preorder_days/lead_time_days
      const numericDays: number | undefined = (() => {
        const candidates: any[] = [
          item?.preorder_days,
          item?.preorderDays,
          item?.lead_days,
          item?.leadTimeDays,
          product?.preorder_days,
          product?.preorderDays,
          product?.lead_days,
          product?.leadTimeDays,
        ];
        for (const c of candidates) {
          const n = Number(c);
          if (isFinite(n)) return n;
        }
        return undefined;
      })();

      let availability =
        normalizeAvailability(item?.availability) ??
        normalizeAvailability(product?.availability);
      if (!availability && typeof numericDays === "number") {
        if (numericDays >= 5) availability = "PO_5_DAY";
        else if (numericDays >= 2) availability = "PO_2_DAY";
        else availability = "READY";
      }

      return {
        id,
        product_id,
        name,
        image,
        price,
        quantity,
        size,
        ...(availability ? { availability } : {}),
      };
    });

    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/carts — forward ke backend database
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token?.accessToken) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    // Normalisasi payload ke format yang diharapkan backend
    const forwardBody = {
      product_id: (body as any)?.product_id ?? (body as any)?.productId,
      quantity: (body as any)?.quantity ?? 1,
      ...(body?.size ? { size: body.size } : {}),
    };
    const response = await fetch(`${BACKEND_URL}/api/v1/carts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.accessToken}`,
      },
      body: JSON.stringify(forwardBody),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || "Gagal menambahkan ke keranjang", ...data },
        { status: response.status }
      );
    }

    // Normalisasi: pastikan ada data.id string dari backend
    const normalized = "data" in data ? data : { data };
    return NextResponse.json(normalized, { status: 201 });
  } catch (error) {
    console.error("Error adding to cart:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
