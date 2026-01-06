import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";

const authHandler = NextAuth({
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          // Paksa gunakan endpoint backend langsung untuk proses login Credentials
          const backendUrl =
            process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

          const loginUrl = `${backendUrl}/api/auth/login`; // Endpoint backend

          const res = await axios.post(
            loginUrl,
            {
              email: credentials?.email,
              password: credentials?.password,
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
              // Pastikan URL absolut diizinkan di lingkungan Next.js server
              transitional: { clarifyTimeoutError: true },
              timeout: 15000,
            },
          );

          const user = res.data.data;

          if (user) {
            // Jika akun belum terverifikasi, blok login dengan error khusus
            const isVerified = user.isVerified ?? user.is_verified ?? true;
            if (!isVerified) {
              // Sertakan email dalam pesan error agar client bisa redirect otomatis ke OTP
              const emailForError = credentials?.email || user.email || "";
              throw new Error(`USER_NOT_VERIFIED:${emailForError}`);
            }
            // Normalisasi field nama lengkap, username, dan nomor HP dari berbagai kemungkinan nama field backend
            const normalizedName =
              user.name ??
              user.full_name ??
              user.fullName ??
              user.nama_lengkap ??
              user.namaLengkap ??
              "";
            const normalizedUsername =
              user.username ?? user.user_name ?? user.uname ?? undefined;
            const normalizedPhone =
              user.phone ??
              user.noHp ??
              user.no_hp ??
              user.phone_number ??
              undefined;
            // Normalize photo URL: if backend returns a relative path, prefix BACKEND_URL
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
            const rawPhoto: string | undefined = user.photo_profile;
            const normalizedPhoto = rawPhoto
              ? /^https?:\/\//.test(rawPhoto)
                ? rawPhoto
                : `${backendUrl}${rawPhoto.startsWith("/") ? "" : "/"}${rawPhoto}`
              : undefined;
            return {
              id: user.id,
              name: normalizedName,
              email: user.email,
              role: user.role,
              image: normalizedPhoto,
              token: res.data.token,
              username: normalizedUsername,
              phone: normalizedPhone,
            };
          }

          return null;
        } catch (err: any) {
          // Propagasi error khusus agar UI dapat menampilkan pesan yang sesuai
          if (typeof err?.message === "string" && err.message.startsWith("USER_NOT_VERIFIED")) {
            // Biarkan error naik ke client (signIn) untuk ditangani
            throw err;
          }
          console.error("Login failed:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.token;
        token.role = user.role;
        token.username = user.username;
        token.phone = user.phone;
        // Persist image URL in token so session always has it
        // @ts-ignore - custom field on JWT
        token.image = (user as any).image;
        // Pastikan token membawa nama lengkap agar sesi selalu punya nilai name
        // (NextAuth default tidak meng-copy name ke token bila tidak diset manual)
        // Gunakan fallback ke username jika nama tidak tersedia
        // @ts-ignore - token.name tidak ada di tipe kustom kita, tapi di JWT default ada
        token.name = (user as any).name ?? user.username ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.username = token.username;
        session.user.phone = token.phone;
        // @ts-ignore - custom field on JWT
        if ((token as any).image) {
          // @ts-ignore - NextAuth Session.User allows image
          session.user.image = (token as any).image as string;
        }
        // Sinkronkan nama lengkap ke sesi; fallback ke username jika perlu
        // @ts-ignore - token.name ada di JWT default
        session.user.name = (token as any).name ?? session.user.name ?? token.username ?? null;
      }

      session.accessToken = token.accessToken;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export default authHandler;
