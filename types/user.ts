import type { Role } from "@/constants/roles";

export interface AppUser {
  uid: string;
  email: string;
  role: Role;
  clientId: string | null;
  createdAt?: Date;
}
