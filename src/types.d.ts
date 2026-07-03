import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      region: string;
      professionalSpecialty?: string | null;
      showVolunteerGuide?: boolean;
      profileComplete?: boolean;
    } & DefaultSession["user"];
  }
  interface User {
    role: string;
    region: string;
    tokenVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    region?: string;
    professionalSpecialty?: string | null;
    tokenVersion?: number;
    tvCheckedAt?: number;
    showVolunteerGuide?: boolean;
    profileComplete?: boolean;
  }
}
