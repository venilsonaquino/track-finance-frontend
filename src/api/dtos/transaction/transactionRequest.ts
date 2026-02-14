export interface TransactionRequest {
  id?: string;
  depositedDate: string;
  description: string;
  walletId: string;
  categoryId: string;
  amount: number;
  transactionType: "INCOME" | "EXPENSE";
  transactionStatus?: "POSTED" | "REVERSED";
  affectBalance?: boolean;
  ofx?: unknown;
}
