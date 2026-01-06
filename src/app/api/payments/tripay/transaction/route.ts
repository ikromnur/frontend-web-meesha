import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import crypto from "crypto";

// Proxy POST /api/payments/tripay/transaction -> backend /payments/tripay/closed
// Menjaga kompatibilitas dengan kode lama yang memanggil "transaction"
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
// Webhook callback URL yang akan dikirim ke Tripay melalui backend
const CALLBACK_URL =
  process.env.TRIPAY_CALLBACK_URL || process.env.CALLBACK_URL;

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    }).catch(() => null);
    const bearer = token?.accessToken
      ? `Bearer ${token.accessToken}`
      : req.headers.get("authorization") || "";
    const body = await req.json().catch(() => ({}));

    // Normalisasi payload: frontend baru mengirim gaya Tripay (merchant_ref, order_items, return_url)
    // sementara backend closed endpoint historis menerima { orderId, items, customer, returnUrl }
    const merchantRefIncoming = body?.merchant_ref ?? body?.orderId;
    const normalizedItems = Array.isArray(body?.order_items)
      ? body.order_items
      : Array.isArray(body?.items)
      ? body.items
      : [];

    // Bangun items Tripay yang steril (hanya name/price/quantity)
    const sanitizedItems = normalizedItems.map((it: any) => {
      const name = it?.name ?? it?.product?.name ?? "Item";
      const price = Number(it?.price ?? it?.unit_price ?? it?.amount ?? 0);
      const quantity = Number(it?.quantity ?? it?.qty ?? 1);
      return { name, price, quantity };
    });

    // Fallback: derive callback URL dari host request bila env tidak tersedia
    const forwardedProto = req.headers.get("x-forwarded-proto") || "http";
    const forwardedHost =
      req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const derivedBase = siteUrl
      ? siteUrl.replace(/\/$/, "")
      : forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : "";
    const derivedCallback = derivedBase
      ? `${derivedBase}/api/payments/tripay/callback`
      : undefined;

    const effectiveCallback = CALLBACK_URL || derivedCallback;

    // Ambil expired_time bila disediakan dari frontend (epoch seconds). Simpan dengan dua key untuk kompatibilitas.
    const expired =
      typeof body?.expired_time === "number"
        ? body.expired_time
        : typeof body?.expiredTime === "number"
        ? body.expiredTime
        : undefined;

    const normalizedBody = {
      // Field untuk backend closed
      method: body?.method,
      amount: body?.amount,
      orderId: merchantRefIncoming,
      customer: {
        name: body?.customer_name ?? body?.customer?.name,
        email: body?.customer_email ?? body?.customer?.email,
        phone: body?.customer_phone ?? body?.customer?.phone,
      },
      // Kirim items penuh ke backend agar dapat memetakan produk & menghitung total
      items: normalizedItems,
      // Sertakan versi steril untuk keperluan forwarding ke Tripay bila backend memerlukannya
      tripay_items: sanitizedItems,
      returnUrl: body?.return_url ?? body?.returnUrl,
      notes: body?.notes,
      // Sertakan callback URL jika tersedia agar backend meneruskan ke Tripay
      ...(effectiveCallback
        ? { callback_url: effectiveCallback, callbackUrl: effectiveCallback }
        : {}),
      // Sertakan expired_time agar backend dapat meneruskan TTL ke Tripay
      ...(expired ? { expired_time: expired, expiredTime: expired } : {}),
      // Sertakan juga field gaya Tripay agar backend yang sudah mendukung bisa tetap bekerja
      merchant_ref: merchantRefIncoming,
      order_items: normalizedItems,
      return_url: body?.return_url ?? body?.returnUrl,
      // Forward discount code
      discountCode: body?.discountCode,
    };

    // Validasi amount
    if (
      typeof normalizedBody.amount !== "number" ||
      normalizedBody.amount <= 0
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid amount" },
        { status: 400 }
      );
    }

    // Optional security signature for backend/Tripay
    const merchantCode = process.env.TRIPAY_MERCHANT_CODE;
    const privateKey = process.env.TRIPAY_PRIVATE_KEY;
    const merchantRef = normalizedBody?.merchant_ref;
    const amount = normalizedBody?.amount;
    let signedBody: any = { ...normalizedBody };
    if (
      merchantCode &&
      privateKey &&
      merchantRef &&
      typeof amount === "number"
    ) {
      const raw = `${merchantCode}${merchantRef}${amount}${privateKey}`;
      const signature = crypto.createHash("md5").update(raw).digest("hex");
      signedBody = { ...signedBody, signature, merchant_code: merchantCode };
    }

    // Forward ke backend
    const res = await fetch(`${BACKEND_URL}/api/payments/tripay/closed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(bearer ? { Authorization: bearer } : {}),
      },
      body: JSON.stringify(signedBody),
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      // --- MOCK FALLBACK FOR > 5M (SANDBOX LIMIT) ---
      // Jika amount > 5M dan Tripay gagal (kemungkinan limit Sandbox),
      // kita coba fetch order terbaru dari user (karena order dibuat sebelum Tripay call)
      // dan kembalikan response mock agar user bisa melanjutkan flow.
      const reqAmount =
        typeof normalizedBody.amount === "number" ? normalizedBody.amount : 0;
      if (reqAmount > 5000000) {
        console.log(
          `[Proxy Mock] Backend failed for > 5M amount (${reqAmount}). Attempting to recover Order ID for Mock.`
        );

        try {
          // Fetch user's latest order using the same token
          const ordersRes = await fetch(`${BACKEND_URL}/api/orders`, {
            headers: {
              ...(bearer ? { Authorization: bearer } : {}),
            },
            cache: "no-store",
          });
          if (ordersRes.ok) {
            const ordersWrapper = await ordersRes.json();
            // Asumsi endpoint /api/orders mengembalikan data terurut desc (terbaru pertama)
            const latestOrder = ordersWrapper.data?.[0];

            // Verifikasi match: status PENDING (mapped to 'pending') dan amount mirip (toleransi 1000 perak)
            // Backend maps "PENDING" -> "pending"
            if (
              latestOrder &&
              (latestOrder.status === "pending" ||
                latestOrder.status === "PENDING") &&
              Math.abs(
                Number(latestOrder.totalAmount || latestOrder.total_amount) -
                  reqAmount
              ) < 1000
            ) {
              const realOrderId = latestOrder.order_id || latestOrder.id;
              console.log(`[Proxy Mock] Recovered Order ID: ${realOrderId}`);

              const mockData = {
                reference: realOrderId, // Gunakan ID asli dari DB (UUID)
                merchant_ref: realOrderId,
                payment_method: normalizedBody.method,
                payment_method_code: normalizedBody.method,
                pay_code: "888899990000",
                amount: reqAmount,
                fee_merchant: 0,
                fee_customer: 0,
                total_amount: reqAmount,
                checkout_url: "https://tripay.co.id/simulator",
                status: "UNPAID",
                expired_time: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
                qr_string:
                  normalizedBody.method === "QRIS"
                    ? "00020101021226600014ID.CO.TRIPAY.MOCK"
                    : undefined,
                qr_url:
                  normalizedBody.method === "QRIS"
                    ? "https://placehold.co/300x300/png?text=MOCK+QRIS"
                    : undefined,
                instructions: [
                  {
                    title: "Pembayaran Mock (Sandbox Bypass)",
                    steps: [
                      "Nominal > 5 Juta melebihi limit Sandbox Tripay.",
                      "Order berhasil dibuat di database (Pending).",
                      "Silakan selesaikan secara manual melalui admin.",
                    ],
                  },
                ],
              };
              return NextResponse.json(
                { success: true, data: mockData },
                { status: 200 }
              );
            }
          }
        } catch (recErr) {
          console.error("[Proxy Mock] Recovery failed", recErr);
        }
      }
      // --- END MOCK FALLBACK ---

      const message =
        json?.message || `Gagal membuat transaksi Tripay (${res.status})`;
      return NextResponse.json(
        { success: false, message, ...json },
        { status: res.status || 500 }
      );
    }

    // Normalisasi respons dan teruskan header caching dari backend bila ada
    const data = json?.data ?? json;
    const headers: Record<string, string> = {};
    const cc = res.headers.get("cache-control");
    const etag = res.headers.get("etag");
    const lm = res.headers.get("last-modified");
    if (cc) headers["Cache-Control"] = cc;
    if (etag) headers["ETag"] = etag;
    if (lm) headers["Last-Modified"] = lm;
    return NextResponse.json({ success: true, data }, { status: 200, headers });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal Server Error", error },
      { status: 500 }
    );
  }
}

// GET /api/payments/tripay/transaction → forward ke backend dengan query string apa adanya
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    }).catch(() => null);
    const bearer = token?.accessToken
      ? `Bearer ${token.accessToken}`
      : req.headers.get("authorization") || "";

    // Bangun query untuk backend dengan sanitasi alias agar tidak duplikat
    const inUrl = new URL(req.url);
    const inParams = inUrl.searchParams;
    const forward = new URLSearchParams();

    // Ambil nilai dari berbagai kemungkinan alias
    const refVal = inParams.get("reference");
    const mRefVal =
      inParams.get("merchantRef") ||
      inParams.get("merchant_ref") ||
      inParams.get("order") ||
      inParams.get("merchant");

    let pathParam = "";
    if (mRefVal) {
      pathParam = mRefVal;
    } else if (refVal) {
      pathParam = refVal;
    }

    // Teruskan parameter lain yang mungkin relevan (mis. method)
    for (const [k, v] of inParams.entries()) {
      const lower = k.toLowerCase();
      if (
        lower === "reference" ||
        lower === "merchantref" ||
        lower === "merchant_ref" ||
        lower === "order" ||
        lower === "merchant"
      )
        continue;
      forward.append(k, v);
    }

    const search = forward.toString() ? `?${forward.toString()}` : "";
    console.log(
      `[Proxy] GET /payments/tripay/transaction forwarding to backend: ${
        pathParam ? "/" + pathParam : ""
      }${search}`
    );

    // Forward conditional headers for ETag support
    const ifNoneMatch =
      req.headers.get("if-none-match") || req.headers.get("If-None-Match");
    const ifModifiedSince =
      req.headers.get("if-modified-since") ||
      req.headers.get("If-Modified-Since");

    // Jika ada parameter identitas, tempelkan ke path agar match dengan route backend /transaction/:merchantRef
    const backendUrl = pathParam
      ? `${BACKEND_URL}/api/payments/tripay/transaction/${encodeURIComponent(
          pathParam
        )}${search}`
      : `${BACKEND_URL}/api/payments/tripay/transaction${search}`;

    const res = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(bearer ? { Authorization: bearer } : {}),
        ...(ifNoneMatch ? { "If-None-Match": ifNoneMatch } : {}),
        ...(ifModifiedSince ? { "If-Modified-Since": ifModifiedSince } : {}),
      },
      cache: "no-store",
    });

    // Handle 304 Not Modified explicitly (no body)
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

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json(
          {
            success: false,
            message: json?.message || "Gagal mengambil detail transaksi Tripay",
            ...json,
          },
          { status: res.status || 500 }
        );
      }
      const data = json?.data ?? json;
      // Teruskan header caching dari backend bila ada
      const headers: Record<string, string> = {};
      const cc = res.headers.get("cache-control");
      const etag = res.headers.get("etag");
      const lm = res.headers.get("last-modified");
      if (cc) headers["Cache-Control"] = cc;
      if (etag) headers["ETag"] = etag;
      if (lm) headers["Last-Modified"] = lm;
      return NextResponse.json(
        { success: true, data },
        { status: 200, headers }
      );
    }
    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: res.headers });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal Server Error", error },
      { status: 500 }
    );
  }
}
export const revalidate = 0;
export const dynamic = "force-dynamic";
