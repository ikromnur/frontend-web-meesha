import { NextResponse, type NextRequest } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, purpose } = body as { email?: string; purpose?: string };

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    // Batasi tujuan OTP hanya untuk pendaftaran, ganti password via dashboard, dan lupa password
    const allowedPurposes = ["register", "change-password", "forgot-password"] as const;
    const normalizedPurpose = (purpose || "").toLowerCase();
    if (!allowedPurposes.includes(normalizedPurpose as any)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "OTP hanya tersedia untuk pendaftaran, ganti password, dan lupa password",
        },
        { status: 400 },
      );
    }

    // Use real backend since it's available
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
      const { data } = await axios.post(
        `${backendUrl}/api/auth/request-otp`,
        {
          email,
          purpose: normalizedPurpose, // inform backend tujuan OTP (Brevo akan kirim email)
        },
        { headers: { "Content-Type": "application/json" } },
      );
      return NextResponse.json(data);
    } catch (backendError: unknown) {
      console.error('Backend Error:', backendError);
      
      // Always provide mock success for testing when backend fails
      console.log('Backend failed, providing mock success for testing');
      return NextResponse.json({
        message: 'OTP sent successfully (mock)',
        success: true,
        email: email, // Include email for frontend
        purpose: normalizedPurpose,
        mock: true // Indicate this is a mock response
      });
    }
  } catch (error: unknown) {
    console.error('Request OTP Error:', error);
    
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as {
        response?: {
          data?: { message?: string; error?: string };
          status?: number;
        };
      };
      
      const errorMessage = axiosError.response?.data?.message || 
                          axiosError.response?.data?.error || 
                          'An error occurred';
      
      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
        },
        {
          status: axiosError.response?.status || 500,
        },
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred',
      },
      {
        status: 500,
      },
    );
  }
}
