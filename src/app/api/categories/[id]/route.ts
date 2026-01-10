import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";

// Forward single-category API to backend database
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:4000";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    }).catch(() => null);
    const bearer = token?.accessToken
      ? `Bearer ${token.accessToken}`
      : request.headers.get("authorization") || "";

    const url = `${BACKEND_URL}/api/categories/${id}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: bearer,
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const status = response.status || 500;
      return NextResponse.json(
        { message: data?.message || "Kategori tidak ditemukan", ...data },
        { status }
      );
    }

    const normalized = "data" in data ? data : { data };
    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    }).catch(() => null);
    const bearer = token?.accessToken
      ? `Bearer ${token.accessToken}`
      : req.headers.get("authorization") || "";
    const url = `${BACKEND_URL}/api/v1/categories/${id}`;

    if (!bearer) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: bearer,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const status = response.status || 500;
      return NextResponse.json(
        { message: data?.message || "Gagal menghapus kategori", ...data },
        { status }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    }).catch(() => null);
    const bearer = token?.accessToken
      ? `Bearer ${token.accessToken}`
      : req.headers.get("authorization") || "";
    const url = `${BACKEND_URL}/api/categories/${id}`;

    if (!bearer) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: bearer,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const status = response.status || 500;
      return NextResponse.json(
        { message: data?.message || "Gagal mengupdate kategori", ...data },
        { status }
      );
    }

    const normalized = "data" in data ? data : { data };
    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error },
      { status: 500 }
    );
  }
}
