import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      region: string;
      professionalSpecialty?: string | null;
    } & DefaultSession["user"];
  }
  interface User {
    role: string;
    region: string;
  }
}