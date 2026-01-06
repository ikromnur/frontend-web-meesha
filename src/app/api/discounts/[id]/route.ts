import { NextResponse, type NextRequest } from "next/server";
import axios, { AxiosError } from "axios";
import { getToken } from "next-auth/jwt";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const headers = {
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json",
    } as const;

    const codeOrId = params.id;

    // Try multiple backend variants: by id, by code (two shapes), fallback to list search
    const endpoints = [
      `${BACKEND_URL}/api/discounts/${codeOrId}`,
      `${BACKEND_URL}/api/discounts/by-code?code=${encodeURIComponent(codeOrId)}`,
      `${BACKEND_URL}/api/discounts/code/${encodeURIComponent(codeOrId)}`,
    ];

    let found: any | undefined;
    for (const url of endpoints) {
      try {
        const res = await axios.get(url, { headers });
        const data = res.data?.data ?? res.data;
        if (data) {
          found = data;
          break;
        }
      } catch (err) {
        const e = err as AxiosError;
        // Continue to next variant on 404/400; rethrow other errors
        if (e.response && [404, 400].includes(e.response.status)) {
          continue;
        }
        throw err;
      }
    }

    // Fallback: search list and only accept EXACT code match
    if (!found) {
      try {
        const searchRes = await axios.get(
          `${BACKEND_URL}/api/discounts?search=${encodeURIComponent(codeOrId)}`,
          { headers },
        );
        const raw = searchRes.data?.data ?? searchRes.data?.items ?? searchRes.data;
        if (Array.isArray(raw)) {
          const exact = raw.find((d: any) =>
            (d?.code ?? d?.discountCode ?? d?.id ?? "")
              .toString()
              .toLowerCase() === codeOrId.toLowerCase(),
          );
          // Only accept exact match; DO NOT default to first item
          found = exact;
        }
      } catch (err) {
        // swallow search errors; will return not found below
      }
    }

    if (!found) {
      return NextResponse.json(
        { success: false, message: `Discount with code '${codeOrId}' not found` },
        { status: 404 },
      );
    }

    const normalizeDate = (value: unknown): string | undefined => {
      if (typeof value !== "string" || !value) return undefined;
      const tryParse = (s: string) => {
        const d = new Date(s);
        return isNaN(d.getTime()) ? undefined : d.toISOString();
      };
      return tryParse(value) || tryParse(value.replace(" ", "T"));
    };

    const data = found;
    const normalized = {
      ...data,
      startTime:
        normalizeDate((data as Record<string, unknown>)?.startTime ?? (data as Record<string, unknown>)?.start_date ?? (data as Record<string, unknown>)?.startDate) ??
        (data as Record<string, unknown>)?.startTime,
      endTime:
        normalizeDate((data as Record<string, unknown>)?.endTime ?? (data as Record<string, unknown>)?.end_date ?? (data as Record<string, unknown>)?.endDate) ??
        (data as Record<string, unknown>)?.endTime,
    };

    return NextResponse.json({ data: normalized }, { status: 200 });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return NextResponse.json(
      {
        success: false,
        message:
          axiosError.response?.data?.message ||
          "Failed to fetch discount",
      },
      { status: axiosError.response?.status || 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
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

    // Backend now expects startDate/endDate ISO strings and numeric value
    const payload: Record<string, unknown> = {};
    if (code !== undefined) payload.code = code;
    if (value !== undefined) payload.value = Number(value);
    if (type !== undefined) payload.type = type;
    if (startDate !== undefined) payload.startDate = new Date(startDate).toISOString();
    if (endDate !== undefined) payload.endDate = new Date(endDate).toISOString();
    if (maxUsage !== undefined) payload.maxUsage = maxUsage;
    if (maxUsagePerUser !== undefined) payload.maxUsagePerUser = maxUsagePerUser;

    const response = await axios.patch(
      `${BACKEND_URL}/api/discounts/${params.id}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    return NextResponse.json(response.data, { status: 200 });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return NextResponse.json(
      {
        success: false,
        message:
          axiosError.response?.data?.message ||
          "Failed to update discount",
      },
      { status: axiosError.response?.status || 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const response = await axios.delete(
      `${BACKEND_URL}/api/discounts/${params.id}`,
      {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    // If backend returns 204 No Content, mirror it
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return NextResponse.json(
      {
        success: false,
        message:
          axiosError.response?.data?.message ||
          "Failed to delete discount",
      },
      { status: axiosError.response?.status || 500 },
    );
  }
}
