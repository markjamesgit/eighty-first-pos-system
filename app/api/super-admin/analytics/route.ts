import { NextResponse } from "next/server";
import { authMiddleware } from "@/middleware/authMiddleware";
import { getAllClients, getTopClientsByUsage } from "@/services/clientService";

export async function GET(request: Request) {
  try {
    const auth = await authMiddleware(request.headers.get("authorization"));
    
    const [clients, topUsage] = await Promise.all([
      getAllClients(auth),
      getTopClientsByUsage(auth, 10)
    ]);

    // Aggregate monthly growth (simulated based on client creation dates)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = new Date().getMonth();
    
    const growthData = months.slice(0, currentMonth + 1).map((month, index) => {
      return {
        name: month,
        tenants: clients.filter(c => {
          const date = (c.createdAt as any)?.seconds ? new Date((c.createdAt as any).seconds * 1000) : new Date();
          return date.getMonth() === index;
        }).length || (index + 1) * 2, // Fallback for demo
        revenue: (index + 1) * 1250 // Simulating revenue growth
      };
    });

    const sectorData = [
      { name: "Active", value: clients.filter(c => c.status === "active").length },
      { name: "Inactive", value: clients.filter(c => c.status === "inactive").length },
    ];

    return NextResponse.json({
      growthData,
      sectorData,
      topUsage: topUsage.map(usage => {
        const client = clients.find(c => c.id === usage.clientId);
        return {
          id: usage.clientId,
          name: client?.name || "Unknown Store",
          status: client?.status || "inactive",
          transactions: usage.totalTransactions,
          products: usage.totalProducts,
          firestore: {
            reads: usage.totalTransactions * 12 + (usage.totalProducts * 2), // Estimation logic
            writes: usage.totalTransactions * 2 + (usage.totalProducts * 1.5)
          },
          storage: {
            images: usage.totalProducts,
            bytes: usage.totalProducts * 1024 * 1024 * 0.5 // 0.5MB per product avg
          }
        };
      }),

      platformUsage: {
        totalReads: clients.length * 5000,
        totalWrites: clients.length * 1200,
        storageUsed: "1.2 GB",
        bandwidth: "4.5 GB"
      }
    });

  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}
