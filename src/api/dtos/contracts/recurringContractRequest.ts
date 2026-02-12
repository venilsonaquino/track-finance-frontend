import { IntervalType } from "@/types/Interval-type ";

export interface RecurringContractRequest {
  walletId: string;
  categoryId: string;
  description: string;
  amount: string;
  transactionType: "INCOME" | "EXPENSE";
  installmentInterval: IntervalType;
  firstDueDate: string;
}
