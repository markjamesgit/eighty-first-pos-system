import { collection, getDocs, deleteDoc } from "firebase/firestore";
import { getFirestoreDb } from "./client";

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
  "alerts",
  "alert_emails",
  "mail",
  "ingredients",
  "product_recipes",
  "ingredient_stock_history"
];

export async function wipeAllDatabaseCollections() {
  const db = getFirestoreDb();
  let deletedCount = 0;

  // We sequentially delete to ensure we don't hit concurrency limits on the free tier
  for (const colName of COLLECTIONS_TO_WIPE) {
    try {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      deletedCount += deletePromises.length;
    } catch (e) {
      console.warn(`Failed to wipe collection ${colName}:`, e);
    }
  }
  
  return deletedCount;
}
