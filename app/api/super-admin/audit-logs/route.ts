import { NextResponse } from "next/server";
import { authMiddleware } from "@/middleware/authMiddleware";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { ROLES } from "@/constants/roles";

export async function GET(request: Request) {
  try {
    const auth = await authMiddleware(request.headers.get("authorization"));
    if (auth.role !== ROLES.SUPER_ADMIN) {
      throw new Error("Forbidden: Super Admin access required");
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "200");
    const moduleFilter = searchParams.get("module") || "all";

    const db = getFirebaseAdminDb();
    let query: any = db.collection("audit_trail").where("clientId", "==", "system");

    if (moduleFilter !== "all") {
      query = query.where("module", "==", moduleFilter);
    }

    const snapshot = await query
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const logs = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.createdAt && typeof data.createdAt.toDate === "function" 
          ? { seconds: data.createdAt.seconds, nanoseconds: data.createdAt.nanoseconds }
          : data.createdAt
      };
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Audit Trail Error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}
