import { NextResponse } from "next/server";
import { authMiddleware } from "@/middleware/authMiddleware";
import { getAllClients, getTopClientsByUsage, getAuditLogs } from "@/services/clientService";

export async function GET(request: Request) {
  try {
    const auth = await authMiddleware(request.headers.get("authorization"));
    
    // Fetch data in parallel
    const [clients, topClients, recentLogs] = await Promise.all([
      getAllClients(auth),
      getTopClientsByUsage(auth, 5),
      getAuditLogs(auth, { limit: 10 })
    ]);

    const activeClients = clients.filter(c => c.status === "active").length;

    return NextResponse.json({
      stats: {
        totalClients: clients.length,
        activeClients,
        totalRevenue: topClients.reduce((sum, c) => sum + (c.totalTransactions * 10), 0),
      },
      topClients,
      recentLogs: recentLogs.map(log => ({
        ...log,
        timestamp: log.timestamp && typeof (log.timestamp as any).toDate === "function" 
          ? { seconds: (log.timestamp as any).seconds, nanoseconds: (log.timestamp as any).nanoseconds }
          : log.timestamp
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}
