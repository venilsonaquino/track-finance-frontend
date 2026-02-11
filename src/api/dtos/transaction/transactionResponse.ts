import { CategoryResponse } from "../category/category-response";
import { WalletResponse } from "../wallet/wallet-response";

export interface TransactionResponse {
  id?: string;
  transactionType?: "INCOME" | "EXPENSE" | "TRANSFER";
  transferType: string;
  depositedDate: string;
  description: string;
  amount: string;
  fitId: string;
  category: CategoryResponse | null;
  wallet: WalletResponse | null;
  isRecurring: boolean | null;
  recurrenceType: string | null;
  recurringInterval: string | null;
  recurringEndDate: string | null;
  isInstallment: boolean | null;
  installmentNumber: number | null;
  installmentInterval: number | null;
  installmentEndDate: string | null;
  isFitIdAlreadyExists: boolean;
  bankName: string;
  bankId: string;
  accountId: string;
  accountType: string;
  currency: string;
  transactionDate: string;
  transactionSource: string;
  affectBalance?: boolean;
  balance: string;
  balanceDate: string;
}
