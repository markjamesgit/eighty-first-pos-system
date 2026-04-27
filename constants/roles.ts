export const ROLES = {
  SUPER_ADMIN: "super_admin",
  CLIENT_ADMIN: "client_admin",
  CASHIER: "cashier",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function isValidRole(value: string): value is Role {
  return Object.values(ROLES).includes(value as Role);
}
