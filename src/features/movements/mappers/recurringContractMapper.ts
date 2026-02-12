import { RecurringContractRequest } from "@/api/dtos/contracts/recurringContractRequest";
import { MovementInput } from "../types";
import { formatAmountString } from "./amountUtils";

export const mapToRecurringContractPayload = (
  input: MovementInput
): RecurringContractRequest => ({
  walletId: input.walletId,
  categoryId: input.categoryId,
  description: input.description.trim(),
  amount: formatAmountString(input.amount),
  transactionType: input.transactionType,
  installmentInterval: input.installmentInterval,
  firstDueDate: input.depositedDate,
});
