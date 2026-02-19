import { TransactionResponse } from "./transactionResponse";

interface TransactionRecord {
  date: string;
  endOfDayBalance: number | null;
  transactions: TransactionResponse[];
}

export type SummaryBadgeTrend = "UP" | "DOWN" | "FLAT";
export type SummaryBadgeReason =
  | "NO_BASELINE"
  | "NO_CHANGE"
  | "NEW_SPEND"
  | "NEW_INCOME"
  | "NEW_BALANCE"
  | "INCREASE_VS_PREVIOUS"
  | "DECREASE_VS_PREVIOUS";

export interface SummaryBadge {
  trend: SummaryBadgeTrend;
  amount: number;
  reason: SummaryBadgeReason;
}

export interface SummaryMetric {
  amount: number;
  badge: SummaryBadge;
}

interface Summary {
  income: SummaryMetric;
  expense: SummaryMetric;
  balance: SummaryMetric;
}

export default interface TransactionsRecordResponse {
  period?: {
    year: number;
    month: number;
    start: string;
    end: string;
  };
  records?: TransactionRecord[];
  items?: TransactionResponse[];
  summary: Summary;
}
