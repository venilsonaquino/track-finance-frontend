import { InstallmentContractRequest } from "@/api/dtos/contracts/installmentContractRequest";
import { MovementInput } from "../types";
import { formatAmountString } from "./amountUtils";

export const mapToInstallmentContractPayload = (
  input: MovementInput
): InstallmentContractRequest => ({
  walletId: input.walletId,
  categoryId: input.categoryId,
  description: input.description.trim(),
  totalAmount: formatAmountString(input.amount),
  installmentsCount: input.installmentsCount ?? 2,
  installmentAmount:
    input.installmentsCount && input.installmentsCount > 0
      ? formatAmountString(input.amount / input.installmentsCount)
      : undefined,
  interval: input.interval,
  firstDueDate: input.depositedDate,
});
