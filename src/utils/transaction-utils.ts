import { formatCurrency } from "@/utils/currency-utils";

export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER" | null | undefined;

type AmountDisplay = {
  text: string;
  className: string;
};

export const getAmountDisplay = (
  amount: number,
  transactionType?: TransactionType
): AmountDisplay => {
  const normalizedAmount = Number.isFinite(amount) ? amount : 0;
  const absoluteAmount = Math.abs(normalizedAmount);

  if (transactionType === "EXPENSE") {
    return {
      text: `-${formatCurrency(absoluteAmount)}`,
      className: "text-red-500",
    };
  }

  if (transactionType === "INCOME") {
    return {
      text: formatCurrency(absoluteAmount),
      className: "text-green-500",
    };
  }

  if (transactionType === "TRANSFER") {
    return {
      text: formatCurrency(absoluteAmount),
      className: "text-muted-foreground",
    };
  }

  const isNegative = normalizedAmount < 0;
  return {
    text: isNegative ? `-${formatCurrency(absoluteAmount)}` : formatCurrency(absoluteAmount),
    className: isNegative ? "text-red-500" : "text-green-500",
  };
};
