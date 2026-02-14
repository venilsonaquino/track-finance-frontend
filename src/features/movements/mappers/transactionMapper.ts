import { TransactionRequest } from "@/api/dtos/transaction/transactionRequest";
import { MovementInput } from "../types";

export const mapToTransactionPayload = (input: MovementInput): TransactionRequest => ({
  depositedDate: input.depositedDate,
  description: input.description.trim(),
  walletId: input.walletId,
  categoryId: input.categoryId,
  amount: input.amount,
  transactionType: input.transactionType ?? (input.amount < 0 ? "EXPENSE" : "INCOME"),
  affectBalance: input.affectBalance,
});
