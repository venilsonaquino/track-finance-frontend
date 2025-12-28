import { IntervalType } from "@/types/Interval-type ";

export interface TransactionRequest {
  id?: string;
  depositedDate: string;
  description: string;
  walletId: string;
  categoryId: string;
  amount: number;
  isInstallment: boolean | null;
  installmentNumber: number | null;
  installmentInterval: IntervalType | null;
  isRecurring: boolean | null;
  fitId?: string | null;
  bankName: string;
  bankId: string;
  accountId: string;
  accountType: string;
  currency: string;
  transactionDate: string;
  transactionSource: string;
  affectBalance?: boolean;
}
