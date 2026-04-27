import { NextResponse } from "next/server";
import { authMiddleware } from "@/middleware/authMiddleware";
import { updateClientUsage, ActionType, resetClientUsage } from "@/services/clientService";

export async function POST(request: Request) {
  try {
    const auth = await authMiddleware(request.headers.get("authorization"));
    
    if (!auth.clientId) {
      return NextResponse.json({ error: "User is not assigned to a client." }, { status: 403 });
    }

    const body = await request.json();
    const actionType = body.actionType as ActionType;

    const validActions: ActionType[] = [
      "product_created", "product_deleted", 
      "transaction_created", 
      "user_created", "user_deleted",
      "heartbeat"
    ];


    if (!validActions.includes(actionType)) {
      return NextResponse.json({ error: "Invalid action type." }, { status: 400 });
    }

    await updateClientUsage(auth.clientId, actionType);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authMiddleware(request.headers.get("authorization"));
    
    if (!auth.clientId) {
      return NextResponse.json({ error: "User is not assigned to a client." }, { status: 403 });
    }

    await resetClientUsage(auth.clientId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}
