import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

// Proxy GET /api/messages -> backend /api/messages
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET }).catch(() => null);
    const bearer = token?.accessToken
      ? `Bearer ${token.accessToken}`
      : req.headers.get("authorization") || "";

    if (!bearer) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = `${BACKEND_URL}/api/messages`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: bearer,
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({ message: "Unknown error" }));

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || `Failed to fetch messages (status ${response.status})`,
          error: data,
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to proxy messages", error: String(error) },
      { status: 500 },
    );
  }
}

