import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { messageId, replyText } = body as {
      messageId?: string;
      replyText?: string;
    };

    if (!messageId || !replyText?.trim()) {
      return NextResponse.json(
        { success: false, message: "ID pesan dan balasan wajib diisi" },
        { status: 400 },
      );
    }

    // In a real application, forward to backend mailer or store reply
    return NextResponse.json(
      {
        success: true,
        message: "Balasan berhasil dikirim",
        data: { id: messageId, reply: replyText, sentAt: new Date().toISOString() },
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan pada server", error },
      { status: 500 },
    );
  }
}