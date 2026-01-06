import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role?: string;
      username?: string;
      phone?: string;
    } & DefaultSession["user"];
    accessToken?: string;
  }

  interface User extends DefaultUser {
    role?: string;
    token?: string;
    username?: string;
    phone?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    accessToken?: string;
    username?: string;
    phone?: string;
  }
}

export type RequestWithAuth = NextRequest & {
  auth: {
    user?: {
      name?: string | null;
      email?: string | null;
      role?: string;
      image?: string | null;
      token?: string;
      username?: string;
      phone?: string;
    };
  };
};
