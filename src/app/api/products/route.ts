import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Build query string from search params
    const queryString = searchParams.toString();
    const url = `${BACKEND_URL}/api/products${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Forward authorization header if exists
        ...(request.headers.get("authorization")
          ? { Authorization: request.headers.get("authorization")! }
          : {}),
      },
      cache: "no-store",
    });

    // If backend returns error, return empty data instead of throwing
    if (!response.ok) {
      console.warn(`Backend returned ${response.status} for products`);
      return NextResponse.json(
        {
          data: [],
          page: 1,
          totalPages: 0,
          totalItems: 0,
        },
        { status: 200 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching products:", error);

    // Return empty data structure instead of error
    return NextResponse.json(
      {
        data: [],
        page: 1,
        totalPages: 0,
        totalItems: 0,
      },
      { status: 200 }
    );
  }
}

// Proxy POST /api/products -> backend /api/products
export async function POST(request: NextRequest) {
  try {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    const formData = await request.formData();

    const response = await fetch(`${BACKEND_URL}/api/products`, {
      method: "POST",
      headers: {
        // Let fetch set multipart boundaries automatically; only forward auth
        ...(request.headers.get("authorization")
          ? { Authorization: request.headers.get("authorization")! }
          : {}),
      },
      body: formData,
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({ message: "Unknown error" }));

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || `Failed to create product (status ${response.status})`,
          error: data,
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to proxy create product", error: String(error) },
      { status: 500 },
    );
  }
}
