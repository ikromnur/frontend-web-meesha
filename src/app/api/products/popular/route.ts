import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Forward popular products API to backend database
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:4000";

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.search || "";
    const url = `${BACKEND_URL}/api/v1/products/popular${search}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Forward authorization header if present (supports both public and protected variants)
        ...(request.headers.get("authorization")
          ? { Authorization: request.headers.get("authorization")! }
          : {}),
      },
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (!res.ok) {
      const json = isJson ? await res.json().catch(() => ({})) : undefined;
      console.warn(
        `[Proxy popular] Backend returned ${res.status}`,
        json?.message || json
      );
      // Return safe empty structure so frontend UI still renders gracefully
      const limitParam = request.nextUrl.searchParams.get("limit");
      const periodParam = request.nextUrl.searchParams.get("period");
      return NextResponse.json(
        {
          data: [],
          limit: Number(limitParam ?? 10),
          period: Number(periodParam ?? 30),
        },
        { status: 200 }
      );
    }

    if (isJson) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: 200 });
    }

    // If backend returns non-JSON, forward as-is
    const text = await res.text();
    return new NextResponse(text as any, {
      status: res.status,
      headers: res.headers,
    });
  } catch (error) {
    console.error("[Proxy popular] Error:", error);
    const limitParam = request.nextUrl.searchParams.get("limit");
    const periodParam = request.nextUrl.searchParams.get("period");
    return NextResponse.json(
      {
        data: [],
        limit: Number(limitParam ?? 10),
        period: Number(periodParam ?? 30),
      },
      { status: 200 }
    );
  }
}
