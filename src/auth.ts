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
          const res = await fetch(`${backendUrl}/api/auth/login`, {
            // Pastikan path-nya benar, mungkin /api/auth/login
            method: "POST",
            body: JSON.stringify(credentials),
            headers: { "Content-Type": "application/json" },
          });

          const data = await res.json();

          // Jika backend mengembalikan error atau status tidak OK
          if (!res.ok || data.error) {
            throw new Error(data.message || "Email atau password tidak valid.");
          }

          // Jika login berhasil, kembalikan data user
          // Next-Auth expects the user object to be returned directly
          if (data) {
            return data;
          }

          return null; // Gagal login
        } catch (error: any) {
          // Tangkap error jaringan atau error lain dari fetch/backend
          console.error("Authorize error:", error);
          // Propagate the error message to the client
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

      // Logika awal (tetap dipertahankan)
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
        session.user.name =
          (token as any).name ?? session.user.name ?? token.username ?? null;
      }

      session.accessToken = token.accessToken;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export default authHandler;
