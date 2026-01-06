import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export async function GET(request: NextRequest) {
  try {
    const url = `${BACKEND_URL}/api/products/meta`;

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

    // If backend returns error, return empty metadata instead of throwing
    if (!response.ok) {
      console.warn(`Backend returned ${response.status} for products/meta`);
      return NextResponse.json(
        {
          categories: [],
          types: [],
          objectives: [],
          colors: [],
          sizes: [],
          priceRange: {
            min: 0,
            max: 0,
          },
        },
        { status: 200 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching product metadata:", error);

    // Return empty metadata structure instead of error
    return NextResponse.json(
      {
        categories: [],
        objectives: [],
        colors: [],
        sizes: [],
        priceRange: {
          min: 0,
          max: 0,
        },
      },
      { status: 200 }
    );
  }
}
