import { NextResponse } from "next/server";
import { ROLES } from "@/constants/roles";
import { authMiddleware } from "@/middleware/authMiddleware";
import { tenantMiddleware } from "@/middleware/tenantMiddleware";
import { searchUsers } from "@/services/authService";

export async function GET(request: Request) {
  try {
    const auth = await authMiddleware(request.headers.get("authorization"));
    tenantMiddleware(auth, null, [ROLES.SUPER_ADMIN]);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";

    const users = await searchUsers(auth, query);

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}
