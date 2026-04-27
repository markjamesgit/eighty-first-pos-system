import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { ROLES } from "@/constants/roles";
import { authMiddleware } from "@/middleware/authMiddleware";
import { tenantMiddleware } from "@/middleware/tenantMiddleware";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

export async function GET(request: Request) {
  try {
    const auth = await authMiddleware(request.headers.get("authorization"));
    tenantMiddleware(auth, null, [ROLES.SUPER_ADMIN]);

    const db = getFirebaseAdminDb();
    const [clientsSnap, usageSnap] = await Promise.all([
      db.collection(COLLECTIONS.CLIENTS).orderBy("createdAt", "desc").get(),
      db.collection(COLLECTIONS.CLIENT_USAGE).get()
    ]);

    const usageMap = new Map();
    usageSnap.docs.forEach(doc => {
      const lastActiveAt = doc.data().lastActiveAt;
      if (lastActiveAt && typeof lastActiveAt.toDate === "function") {
        usageMap.set(doc.id, { seconds: lastActiveAt.seconds, nanoseconds: lastActiveAt.nanoseconds });
      } else {
        usageMap.set(doc.id, lastActiveAt);
      }
    });

    const clients = clientsSnap.docs.map((doc) => {


      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        lastActiveAt: usageMap.get(doc.id) || null
      };
    });

    return NextResponse.json({ clients });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}


export async function POST(request: Request) {
  try {
    const auth = await authMiddleware(request.headers.get("authorization"));
    tenantMiddleware(auth, null, [ROLES.SUPER_ADMIN]);

    const body = (await request.json()) as { name?: string };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Client name is required." }, { status: 400 });
    }

    const db = getFirebaseAdminDb();
    const result = await db.collection(COLLECTIONS.CLIENTS).add({
      name: body.name.trim(),
      status: "active",
      createdBy: auth.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Log the action
    await db.collection("audit_trail").add({
      clientId: "system",
      module: "Tenants",
      action: "create_tenant",
      description: `New tenant created: ${body.name}`,
      performedBy: auth.email || auth.uid,
      createdAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({ id: result.id });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authMiddleware(request.headers.get("authorization"));
    tenantMiddleware(auth, null, [ROLES.SUPER_ADMIN]);

    const body = (await request.json()) as {
      clientId?: string;
      name?: string;
      status?: "active" | "inactive";
    };

    if (!body.clientId || (!body.status && body.name === undefined)) {
      return NextResponse.json(
        { error: "clientId and at least one update field (name/status) are required." },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (body.status) {
      updates.status = body.status;
    }

    if (body.name !== undefined) {
      const normalized = body.name.trim();
      if (!normalized) {
        return NextResponse.json({ error: "Client name cannot be empty." }, { status: 400 });
      }
      updates.name = normalized;
    }

    const db = getFirebaseAdminDb();
    await db.collection(COLLECTIONS.CLIENTS).doc(body.clientId).update(updates);

    // Log the action
    await db.collection("audit_trail").add({
      clientId: "system",
      module: "Tenants",
      action: "update_tenant",
      description: `Tenant updated: ${body.clientId} (${Object.keys(updates).filter(k => k !== 'updatedAt').join(', ')})`,
      performedBy: auth.email || auth.uid,
      createdAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}
