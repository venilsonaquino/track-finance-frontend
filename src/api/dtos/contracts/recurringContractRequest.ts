import { IntervalType } from "@/types/Interval-type ";

export interface RecurringContractRequest {
  walletId: string;
  categoryId: string;
  description: string;
  amount: string;
  interval: IntervalType;
  firstDueDate: string;
}
