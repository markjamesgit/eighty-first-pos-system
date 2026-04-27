import { getFirebaseAdminDb } from "../lib/firebase/admin";
import { COLLECTIONS } from "../constants/collections";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const CLIENT_ID = process.argv[2];

if (!CLIENT_ID) {
  console.error("Please provide a clientId as an argument.");
  process.exit(1);
}

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

async function wipe() {
  const db = getFirebaseAdminDb();
  console.log(`Starting wipe for client: ${CLIENT_ID}`);

  for (const colName of COLLECTIONS_TO_WIPE) {
    try {
      console.log(`Wiping collection: ${colName}...`);
      const snapshot = await db.collection(colName).where("clientId", "==", CLIENT_ID).get();
      
      if (snapshot.empty) {
        console.log(`  No documents found in ${colName}.`);
        continue;
      }

      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      console.log(`  Deleted ${snapshot.size} documents from ${colName}.`);
    } catch (e) {
      console.error(`  Failed to wipe ${colName}:`, e);
    }
  }

  // Reset usage
  console.log("Resetting usage stats...");
  await db.collection("client_usage").doc(CLIENT_ID).set({
    totalProducts: 0,
    totalTransactions: 0,
    totalUsers: 0,
    lastActiveAt: new Date(),
  }, { merge: true });
  
  console.log("Wipe complete!");
}

wipe().catch(console.error);
