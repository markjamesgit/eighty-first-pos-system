import { queryByClient } from "@/lib/db/queryByClient";
import { writeWithClient } from "@/lib/db/writeWithClient";
import { getFirebaseClientDb } from "@/lib/firebase/client";
import { ROLES, type Role } from "@/constants/roles";
import type { Transaction } from "@/types/transaction";

export async function listTransactionsByClient(clientId: string) {
  return queryByClient<Transaction>(getFirebaseClientDb(), "TRANSACTIONS", clientId);
}

export async function createTransactionForClient(
  clientId: string,
  total: number,
  role: Role,
) {
  if (![ROLES.CASHIER, ROLES.CLIENT_ADMIN, ROLES.SUPER_ADMIN].includes(role)) {
    throw new Error("Forbidden: role cannot create transactions.");
  }

  return writeWithClient(getFirebaseClientDb(), "TRANSACTIONS", { total }, clientId);
}
