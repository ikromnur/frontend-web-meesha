import { NextResponse, type NextRequest } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, newPassword, confirmPassword, otp } = body;

    // Proxy ke backend asli
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    console.log(
      `[PROXY] Resetting password for ${email} to ${backendUrl}/api/v1/auth/reset-password`
    );

    try {
      // Coba kirim dengan newPassword
      const response = await axios.post(
        `${backendUrl}/api/v1/auth/reset-password`,
        {
          email,
          newPassword,
          otp,
          // Beberapa backend butuh confirmPassword
          confirmPassword: confirmPassword || newPassword,
        }
      );

      return NextResponse.json(response.data);
    } catch (backendError: any) {
      console.error(
        "[PROXY] Backend Error:",
        backendError.response?.data || backendError.message
      );

      // Jika error karena field name salah, coba 'password'
      if (backendError.response?.status === 400) {
        console.log("[PROXY] Retrying with 'password' field...");
        try {
          const retryResponse = await axios.post(
            `${backendUrl}/api/v1/auth/reset-password`,
            {
              email,
              password: newPassword,
              otp,
              confirmPassword: confirmPassword || newPassword,
            }
          );
          return NextResponse.json(retryResponse.data);
        } catch (retryError: any) {
          console.error(
            "[PROXY] Retry failed:",
            retryError.response?.data || retryError.message
          );
          // Return original error
          return NextResponse.json(
            backendError.response?.data || {
              success: false,
              message: "Backend error",
            },
            { status: backendError.response?.status || 500 }
          );
        }
      }

      return NextResponse.json(
        backendError.response?.data || {
          success: false,
          message: "Backend error",
        },
        { status: backendError.response?.status || 500 }
      );
    }
  } catch (error) {
    console.error("Error proxying reset password:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan server internal.",
      },
      { status: 500 }
    );
  }
}
