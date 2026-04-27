export const COLLECTIONS = {
  CLIENTS: "clients",
  CLIENT_USAGE: "client_usage",
  USERS: "users",
  PRODUCTS: "products",
  TRANSACTIONS: "transactions",
  AUDIT_LOGS: "audit_logs",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
