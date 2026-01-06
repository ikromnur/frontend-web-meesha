import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const { pathname } = req.nextUrl;

  // 1. Proteksi Halaman Dashboard (Hanya Admin)
  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // 2. Redirect Admin dari Halaman User (Landing Page, dll) ke Dashboard
  // Jika user adalah ADMIN dan mencoba mengakses halaman publik (bukan dashboard/api/static)
  if (token?.role === "ADMIN") {
    // Daftar path yang dikecualikan (boleh diakses admin)
    // Note: API dan _next sudah difilter di matcher config, tapi double check di sini aman
    const isDashboard = pathname.startsWith("/dashboard");
    const isApi = pathname.startsWith("/api");
    const isNext = pathname.startsWith("/_next");
    // const isStatic = pathname.includes("."); // file statis
    const isStatic = /\.[a-z0-9]+$/i.test(pathname); // check extension

    // Jika bukan dashboard dan bukan API dan bukan file statis, redirect ke dashboard
    if (!isDashboard && !isApi && !isNext && !isStatic) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Matcher diperbarui untuk menangkap semua route kecuali api dan static files
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (optional, but good practice)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
