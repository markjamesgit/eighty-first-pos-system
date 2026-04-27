import { getFirebaseAuth } from "@/services/firebase/client";

export type ActionType = "product_created" | "product_deleted" | "transaction_created" | "user_created" | "user_deleted";

export async function trackUsage(actionType: ActionType) {
  try {
    const auth = getFirebaseAuth();
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;

    await fetch("/api/usage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ actionType }),
    });
  } catch (error) {
    console.error("Failed to track usage:", error);
  }
}
export async function resetUsage() {
  try {
    const auth = getFirebaseAuth();
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;

    await fetch("/api/usage", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    console.error("Failed to reset usage:", error);
  }
}
