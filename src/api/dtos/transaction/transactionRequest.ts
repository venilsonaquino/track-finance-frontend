export interface TransactionRequest {
  id?: string;
  depositedDate: string;
  description: string;
  walletId: string;
  categoryId: string;
  amount: number;
  transactionType: "INCOME" | "EXPENSE" | "TRANSFER";
  transactionStatus?: "POSTED" | "REVERSED";
  affectBalance?: boolean;
  ofx?: unknown;
}
