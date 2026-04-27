import { listTransactionsByClient } from "@/services/transactionService";

export async function getClientAnalytics(clientId: string) {
  const transactions = await listTransactionsByClient(clientId);
  const totalRevenue = transactions.reduce((sum, entry) => sum + (entry.total ?? 0), 0);

  return {
    totalTransactions: transactions.length,
    totalRevenue,
  };
}
