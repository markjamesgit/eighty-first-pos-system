import { NextResponse } from "next/server";
import { authMiddleware } from "@/middleware/authMiddleware";
import { bootstrapSuperAdmin } from "@/services/authService";

export async function POST(request: Request) {
  try {
    const auth = await authMiddleware(request.headers.get("authorization"));
    await bootstrapSuperAdmin(auth);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}
