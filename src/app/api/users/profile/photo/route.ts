import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import axios, { AxiosError } from "axios";

// Backend base URL; default to localhost:4000 if not provided
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

// Upload profile photo
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.accessToken) {
      return NextResponse.json(
        { success: false, message: "Unauthorized - Please login" },
        { status: 401 },
      );
    }

    const formData = await request.formData();

    // Forward to backend
    const response = await axios.post(
      `${BACKEND_URL}/api/profile/photo`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return NextResponse.json(response.data, { status: 200 });
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

    if (axiosError.response?.status === 404) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Profile photo upload endpoint not found on backend.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          axiosError.response?.data?.message || "Failed to upload photo",
      },
      { status: axiosError.response?.status || 500 },
    );
  }
}

// Delete profile photo
export async function DELETE(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.accessToken) {
      return NextResponse.json(
        { success: false, message: "Unauthorized - Please login" },
        { status: 401 },
      );
    }

    const response = await axios.delete(
      `${BACKEND_URL}/api/profile/photo`,
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

    if (axiosError.response?.status === 404) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Profile photo delete endpoint not found on backend.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          axiosError.response?.data?.message || "Failed to delete photo",
      },
      { status: axiosError.response?.status || 500 },
    );
  }
}