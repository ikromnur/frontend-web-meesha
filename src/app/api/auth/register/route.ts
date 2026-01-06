import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, name, email, phone, password } = body;

    console.log("Registration request received:", {
      username,
      name,
      email,
      phone,
      passwordLength: password?.length
    });

    // Validate required fields
    if (!username || !name || !email || !phone || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "All fields are required",
        },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email format",
        },
        { status: 400 },
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 8 characters",
        },
        { status: 400 },
      );
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username) || username.length < 3) {
      return NextResponse.json(
        {
          success: false,
          message: "Username must be at least 3 characters and contain only letters, numbers, and underscores",
        },
        { status: 400 },
      );
    }

    console.log("New user registration:", { username, name, email, phone });
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    console.log("Backend URL:", `${backendUrl}/api/auth/register`);

    // Send registration data to backend
    const backendResponse = await axios.post(
      `${backendUrl}/api/auth/register`,
      {
        username,
        name,
        email,
        phone,
        password,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Backend registration successful:", backendResponse.data);

    // Return success response from backend
    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        data: backendResponse.data.data || backendResponse.data,
      },
      { status: 201 },
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Registration error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
      });

      return NextResponse.json(
        {
          success: false,
          message: error.response?.data?.message || "Registration failed",
          error: error.response?.data,
        },
        { status: error.response?.status || 500 },
      );
    }

    console.error("Generic registration error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An error occurred during registration. Please try again.",
      },
      { status: 500 },
    );
  }
}
