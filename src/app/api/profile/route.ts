import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import axios, { AxiosError } from "axios";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export async function GET(request: NextRequest) {
  try {
    console.log("[Profile API] GET request received");

    // Get auth token from NextAuth
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    console.log("[Profile API] Token exists:", !!token);

    if (!token || !token.accessToken) {
      console.log("[Profile API] Unauthorized - No token");
      return NextResponse.json(
        { success: false, message: "Unauthorized - Please login" },
        { status: 401 }
      );
    }

    console.log(
      "[Profile API] Forwarding to backend:",
      `${BACKEND_URL}/api/profile`
    );

    // Forward request to backend
    // FIX: Backend endpoint for user profile update is /api/users/profile, NOT /api/profile
    const response = await axios.get(`${BACKEND_URL}/api/users/profile`, {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("[Profile API] Backend response status:", response.status);
    return NextResponse.json(response.data, { status: 200 });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;

    console.error("[Profile API] Error:", {
      status: axiosError.response?.status,
      message: axiosError.message,
      data: axiosError.response?.data,
    });

    // Handle specific error cases
    if (axiosError.code === "ECONNREFUSED") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Backend server is not running. Please start the backend server.",
        },
        { status: 503 }
      );
    }

    if (axiosError.response?.status === 404) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Profile endpoint not found on backend. Please check backend implementation.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          axiosError.response?.data?.message || "Failed to fetch profile",
      },
      { status: axiosError.response?.status || 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log("[Profile API] PUT request received");

    // Get auth token from NextAuth
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    console.log("[Profile API] Token exists:", !!token);

    if (!token || !token.accessToken) {
      console.log("[Profile API] Unauthorized - No token");
      return NextResponse.json(
        { success: false, message: "Unauthorized - Please login" },
        { status: 401 }
      );
    }

    // Get form data
    const formData = await request.formData();
    console.log("[Profile API] FormData fields:", Array.from(formData.keys()));

    console.log(
      "[Profile API] Forwarding to backend:",
      `${BACKEND_URL}/api/profile`
    );

    // Forward request to backend with FormData
    // FIX: Backend endpoint for user profile update is /api/users/profile, NOT /api/profile
    const response = await axios.patch(
      `${BACKEND_URL}/api/users/profile`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );

    console.log("[Profile API] Update successful");
    return NextResponse.json(response.data, { status: 200 });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;

    console.error("[Profile API] Update error:", {
      status: axiosError.response?.status,
      message: axiosError.message,
      data: axiosError.response?.data,
    });

    // Handle specific error cases
    if (axiosError.code === "ECONNREFUSED") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Backend server is not running. Please start the backend server.",
        },
        { status: 503 }
      );
    }

    if (axiosError.response?.status === 404) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Profile update endpoint not found on backend. Please check backend implementation.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          axiosError.response?.data?.message || "Failed to update profile",
      },
      { status: axiosError.response?.status || 500 }
    );
  }
}
