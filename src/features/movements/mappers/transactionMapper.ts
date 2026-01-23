import { TransactionRequest } from "@/api/dtos/transaction/transactionRequest";
import { MovementInput } from "../types";

export const mapToTransactionPayload = (input: MovementInput): TransactionRequest => ({
  depositedDate: input.depositedDate,
  description: input.description.trim(),
  walletId: input.walletId,
  categoryId: input.categoryId,
  amount: input.amount,
  isInstallment: null,
  installmentNumber: null,
  installmentInterval: null,
  isRecurring: null,
  fitId: null,
  bankName: "Manual",
  bankId: "manual",
  accountId: input.walletId,
  accountType: "MANUAL",
  currency: "BRL",
  transactionDate: input.depositedDate,
  transactionSource: "MANUAL",
  affectBalance: input.affectBalance,
});
