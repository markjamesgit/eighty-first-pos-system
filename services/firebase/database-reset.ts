import { collection, getDocs, deleteDoc, writeBatch, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import { getFirestoreDb } from "./client";
import { resetUsage } from "@/lib/usage-utils";

const COLLECTIONS_TO_WIPE = [
  "products",
  "orders_active",
  "orders_history",
  "sales_summary",
  "stock_history",
  "maintenance_categories",
  "maintenance_variants",
  "maintenance_addons",
  "maintenance_modifiers",
  "audit_trail",
  "audit_logs",
  "alerts",
  "alert_emails",
  "mail",
  "ingredients",
  "product_recipes",
  "ingredient_stock_history",
  "transactions"
];

export async function wipeAllDatabaseCollections(clientId: string) {
  const db = getFirestoreDb();
  
  // Log the maintenance action
  await addDoc(collection(db, "audit_trail"), {
    clientId: "system", // Maintenance is a system-level action relative to the tenant
    module: "Maintenance",
    action: "database_wipe",
    description: `Complete database reset performed for tenant: ${clientId}`,
    performedBy: "Super Admin",
    createdAt: serverTimestamp()
  });

  let totalDeleted = 0;

  for (const colName of COLLECTIONS_TO_WIPE) {
    try {
      const colRef = collection(db, colName);
      
      // We MUST use the clientId filter to satisfy Firestore security rules for multi-tenant isolation.
      // This ensures we only fetch and delete documents belonging to this tenant.
      const snapshot = await getDocs(query(colRef, where("clientId", "==", clientId)));
      
      if (snapshot.empty) continue;

      const docs = snapshot.docs;
      // Delete in batches of 500 (Firestore limit)
      for (let i = 0; i < docs.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + 500);
        chunk.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }

      totalDeleted += docs.length;
    } catch (e) {
      console.warn(`Failed to wipe collection ${colName}:`, e);
    }
  }
  
  // Reset usage counters in admin dashboard
  await resetUsage();
  
  return totalDeleted;
}
