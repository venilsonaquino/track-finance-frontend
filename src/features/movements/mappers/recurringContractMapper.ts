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
  interval: input.interval,
  firstDueDate: input.depositedDate,
});
