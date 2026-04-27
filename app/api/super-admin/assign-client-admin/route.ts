import { NextResponse } from "next/server";
import { ROLES } from "@/constants/roles";
import { authMiddleware } from "@/middleware/authMiddleware";
import { tenantMiddleware } from "@/middleware/tenantMiddleware";
import { assignUserRole } from "@/services/authService";
import { getFirebaseAdminDb, getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: Request) {
  try {
    const auth = await authMiddleware(request.headers.get("authorization"));
    tenantMiddleware(auth, null, [ROLES.SUPER_ADMIN]);

    const body = (await request.json()) as {
      uid?: string;
      email?: string;
      clientId?: string;
    };

    if (!body.uid || !body.email || !body.clientId) {
      return NextResponse.json({ error: "uid, email, and clientId are required." }, { status: 400 });
    }

    await assignUserRole(auth, {
      uid: body.uid,
      email: body.email,
      role: ROLES.CLIENT_ADMIN,
      clientId: body.clientId,
    });

    const db = getFirebaseAdminDb();
    await db.collection("audit_trail").add({
      clientId: "system",
      module: "Tenants",
      action: "assign_admin",
      description: `User ${body.email} assigned as Admin for tenant ${body.clientId}`,
      performedBy: auth.email || auth.uid,
      createdAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authMiddleware(request.headers.get("authorization"));
    tenantMiddleware(auth, null, [ROLES.SUPER_ADMIN]);

    const body = (await request.json()) as {
      uid?: string;
      clientId?: string;
    };

    if (!body.uid || !body.clientId) {
      return NextResponse.json({ error: "uid and clientId are required." }, { status: 400 });
    }

    const firebaseAuth = getFirebaseAdminAuth();
    const userToRevoke = await firebaseAuth.getUser(body.uid);
    
    // Clear custom claims
    await firebaseAuth.setCustomUserClaims(body.uid, {});
    
    const db = getFirebaseAdminDb();
    await db.collection("audit_trail").add({
      clientId: "system",
      module: "Tenants",
      action: "revoke_admin",
      description: `Revoked Admin access for ${userToRevoke.email} from tenant ${body.clientId}`,
      performedBy: auth.email || auth.uid,
      createdAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}
