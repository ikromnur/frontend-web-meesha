import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Forward recommendations API to backend, with safe fallback to popular
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:4000";

async function fetchJson(url: string, headers: Record<string, string>) {
  const res = await fetch(url, { method: "GET", headers, cache: "no-store" });
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : undefined;
  return { res, data, isJson } as const;
}

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.search || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(request.headers.get("authorization")
        ? { Authorization: request.headers.get("authorization")! }
        : {}),
    };

    // Primary: recommendations (SAW-backed)
    const recUrl = `${BACKEND_URL}/api/v1/products/recommendations${search}`;
    const {
      res: recRes,
      data: recData,
      isJson: recIsJson,
    } = await fetchJson(recUrl, headers);

    // If OK and JSON, return it unless empty
    if (recRes.ok && recIsJson) {
      const list: any[] = Array.isArray(recData?.data)
        ? recData.data
        : Array.isArray(recData?.items)
        ? recData.items
        : Array.isArray(recData)
        ? (recData as any[])
        : Array.isArray((recData as any)?.data?.data)
        ? (recData as any).data.data
        : [];

      if (list.length > 0) {
        return NextResponse.json(recData, { status: 200 });
      }
    }

    // Fallback: popular (also SAW-backed per backend doc)
    const popUrl = `${BACKEND_URL}/api/v1/products/popular${search}`;
    const {
      res: popRes,
      data: popData,
      isJson: popIsJson,
    } = await fetchJson(popUrl, headers);
    if (popRes.ok && popIsJson) {
      return NextResponse.json(popData, { status: 200 });
    }

    // If backend returns non-JSON or error, respond with safe empty
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
  } catch (error) {
    console.error("[Proxy recommendations] Error:", error);
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
