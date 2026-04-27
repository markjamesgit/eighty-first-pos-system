import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { ROLES } from "@/constants/roles";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { authMiddleware } from "@/middleware/authMiddleware";
import { tenantMiddleware } from "@/middleware/tenantMiddleware";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await authMiddleware(request.headers.get("authorization"));
    tenantMiddleware(auth, null, [ROLES.SUPER_ADMIN]);

    const { id } = await context.params;
    const db = getFirebaseAdminDb();
    
    // Fetch all data in parallel
    const [clientSnap, usageSnap, auditSnap, usersSnap] = await Promise.all([
      db.collection(COLLECTIONS.CLIENTS).doc(id).get(),
      db.collection(COLLECTIONS.CLIENT_USAGE).doc(id).get(),
      db.collection("audit_trail")
        .where("clientId", "==", id)
        .where("module", "in", ["Authentication", "Orders", "Reports", "Inventory", "Recipes", "Products", "POS"])
        .orderBy("createdAt", "desc")
        .limit(100)
        .get(),
      db.collection(COLLECTIONS.USERS)
        .where("clientId", "==", id)
        .get()
    ]);

    if (!clientSnap.exists) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    return NextResponse.json({ 
      client: { id: clientSnap.id, ...clientSnap.data() },
      usage: usageSnap.exists ? usageSnap.data() : null,
      recentLogs: auditSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.createdAt && typeof data.createdAt.toDate === "function" 
            ? { seconds: data.createdAt.seconds, nanoseconds: data.createdAt.nanoseconds }
            : data.createdAt
        };
      }),
      admins: usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() }))
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await authMiddleware(request.headers.get("authorization"));
    tenantMiddleware(auth, null, [ROLES.SUPER_ADMIN]);

    const { id } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      status?: "active" | "inactive";
    };

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (body.name !== undefined) {
      const normalized = body.name.trim();
      if (!normalized) {
        return NextResponse.json({ error: "Client name cannot be empty." }, { status: 400 });
      }
      updates.name = normalized;
    }

    if (body.status !== undefined) {
      updates.status = body.status;
    }

    await getFirebaseAdminDb().collection(COLLECTIONS.CLIENTS).doc(id).update(updates);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}
