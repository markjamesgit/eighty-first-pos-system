import { NextResponse } from "next/server";
import { ROLES } from "@/constants/roles";
import { authMiddleware } from "@/middleware/authMiddleware";
import { tenantMiddleware } from "@/middleware/tenantMiddleware";
import { createClientAdmin } from "@/services/authService";

export async function POST(request: Request) {
  try {
    const auth = await authMiddleware(request.headers.get("authorization"));
    tenantMiddleware(auth, null, [ROLES.SUPER_ADMIN]);

    const body = (await request.json()) as {
      email?: string;
      password?: string;
      clientId?: string;
    };

    if (!body.email || !body.password || !body.clientId) {
      return NextResponse.json({ error: "email, password, and clientId are required." }, { status: 400 });
    }

    if (body.password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const user = await createClientAdmin(auth, {
      email: body.email,
      password: body.password,
      clientId: body.clientId,
    });

    return NextResponse.json({ ok: true, uid: user.uid });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}
