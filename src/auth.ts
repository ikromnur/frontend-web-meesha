import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";

const authHandler = NextAuth({
  pages: {
    signIn: "/login",
    error: "/login", // Redirect errors back to the login page
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        // Gunakan URL internal untuk komunikasi server-ke-server,
        // atau URL publik sebagai cadangan.
        const backendUrl =
          process.env.INTERNAL_BACKEND_URL ||
          process.env.NEXT_PUBLIC_BACKEND_URL;

        try {
          const res = await fetch(`${backendUrl}/api/v1/auth/login`, {
            method: "POST",
            body: JSON.stringify(credentials),
            headers: { "Content-Type": "application/json" },
          });

          const data = await res.json();

          // Jika backend mengembalikan error atau status tidak OK
          if (!res.ok || data.error || data.success === false) {
            throw new Error(data.message || "Email atau password tidak valid.");
          }

          // Jika login berhasil, kembalikan data user
          if (data) {
            return data;
          }

          return null; // Gagal login
        } catch (error: any) {
          console.error("Authorize error:", error);
          throw new Error(
            error.message || "Terjadi masalah saat menghubungi server."
          );
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // ------------------------------
      // TAMBAHAN: Handle update session dari client (updateSession)
      // ------------------------------
      if (trigger === "update" && session?.user) {
        if (session.user.image !== undefined) token.image = session.user.image;
        if (session.user.name !== undefined) token.name = session.user.name;
        if (session.user.username !== undefined)
          token.username = session.user.username;
        if (session.user.phone !== undefined) token.phone = session.user.phone;
      }

      // Logika awal
      if (user) {
        // Handle various backend response structures
        // 1. { data: { ...user, token: "..." } } -> standard
        // 2. { data: { user: { ... }, token: "..." } } -> nested user
        // 3. { ...user, token: "..." } -> flat

        const responseData = user as any;

        // Extract token
        const accessToken =
          responseData.token ||
          responseData.data?.token ||
          responseData.accessToken ||
          responseData.data?.accessToken;

        // Extract user object
        // Prioritize nested user object if it exists
        const backendUser =
          responseData.data?.user || // Nested user in data (e.g. data: { user: {...} })
          responseData.user || // Nested user in root (e.g. { user: {...} })
          responseData.data || // User fields in data (e.g. data: { name: ... })
          responseData; // User fields in root (e.g. { name: ... })

        token.accessToken = accessToken;
        token.role = backendUser.role;
        token.username = backendUser.username;
        token.phone = backendUser.phone;

        // FIX: Ensure email is captured from backend response
        token.email = backendUser.email;

        // Persist image URL in token so session always has it
        token.image = backendUser.photo_profile || backendUser.image;

        // Pastikan token membawa nama lengkap agar sesi selalu punya nilai name
        token.name = backendUser.name || backendUser.username || null;
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
        session.user.name =
          (token as any).name ?? session.user.name ?? token.username ?? null;

        // FIX: Ensure email from token is passed to session
        if (token.email) {
          session.user.email = token.email;
        }
      }

      session.accessToken = token.accessToken;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export default authHandler;
