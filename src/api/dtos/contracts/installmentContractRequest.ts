import { IntervalType } from "@/types/Interval-type ";

export interface InstallmentContractRequest {
  walletId: string;
  categoryId: string;
  description: string;
  totalAmount: string;
  installmentsCount: number;
  installmentAmount?: string;
  installmentInterval : IntervalType;
  firstDueDate: string;
}
