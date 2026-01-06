import { NextResponse, type NextRequest } from "next/server";
import axios, { AxiosError } from "axios";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token?.accessToken) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const url = new URL(`${BACKEND_URL}/api/discounts`);

    // Forward search query param if present
    const search = req.nextUrl.searchParams.get("search");
    if (search) url.searchParams.set("search", search);

    const response = await axios.get(url.toString(), {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = response.data;
    const discounts = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
      ? data
      : [];

    // Normalize date fields to ISO strings to ensure frontend parsing succeeds
    const normalizeDate = (value: unknown): string | undefined => {
      if (typeof value !== "string" || !value) return undefined;
      const tryParse = (s: string) => {
        const d = new Date(s);
        return isNaN(d.getTime()) ? undefined : d.toISOString();
      };
      return (
        tryParse(value) ||
        // Handle common "YYYY-MM-DD HH:mm:ss" format by converting space to 'T'
        tryParse(value.replace(" ", "T"))
      );
    };

    const normalized = discounts.map((d: Record<string, unknown>) => ({
      ...d,
      startTime:
        normalizeDate(d.startTime ?? d.start_date ?? d.startDate) ??
        (d.startTime as string | undefined),
      endTime:
        normalizeDate(d.endTime ?? d.end_date ?? d.endDate) ??
        (d.endTime as string | undefined),
    }));

    return NextResponse.json({ data: normalized }, { status: 200 });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    if (axiosError.code === "ECONNREFUSED") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Backend server is not running. Please start the backend server.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        message:
          axiosError.response?.data?.message ||
          "Failed to fetch discounts",
      },
      { status: axiosError.response?.status || 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { code, value, type, startDate, endDate, maxUsage, maxUsagePerUser } = body;

    // Basic validation
    if (!code || !value || !type || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    // Map form values to backend payload; use startTime/endTime to match UI type
    const payload = {
      code,
      value,
      type,
      startTime: new Date(startDate).toISOString(),
      endTime: new Date(endDate).toISOString(),
      maxUsage,
      maxUsagePerUser,
    };

    const response = await axios.post(
      `${BACKEND_URL}/api/discounts`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    return NextResponse.json(response.data, { status: 201 });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return NextResponse.json(
      {
        success: false,
        message:
          axiosError.response?.data?.message ||
          "Failed to create discount",
      },
      { status: axiosError.response?.status || 500 },
    );
  }
}
