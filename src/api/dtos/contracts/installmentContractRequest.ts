import { IntervalType } from "@/types/Interval-type ";

export interface InstallmentContractRequest {
  walletId: string;
  categoryId: string;
  description: string;
  totalAmount: string;
  installmentsCount: number;
  installmentAmount?: string;
  interval: IntervalType;
  firstDueDate: string;
}
