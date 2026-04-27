import { getFirebaseClientDb } from "@/lib/firebase/client";
import { queryByClient } from "@/lib/db/queryByClient";
import { writeWithClient } from "@/lib/db/writeWithClient";
import { ROLES, type Role } from "@/constants/roles";
import type { Product } from "@/types/product";

function canManageProducts(role: Role) {
  return role === ROLES.CLIENT_ADMIN || role === ROLES.SUPER_ADMIN;
}

export async function listProductsByClient(clientId: string) {
  return queryByClient<Product>(getFirebaseClientDb(), "PRODUCTS", clientId);
}

export async function createProductForClient(
  clientId: string,
  payload: Pick<Product, "name" | "price">,
  role: Role,
) {
  if (!canManageProducts(role)) {
    throw new Error("Forbidden: role cannot create products.");
  }

  return writeWithClient(getFirebaseClientDb(), "PRODUCTS", payload, clientId);
}
