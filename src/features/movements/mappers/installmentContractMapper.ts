import { InstallmentContractRequest } from "@/api/dtos/contracts/installmentContractRequest";
import { MovementInput } from "../types";
import { calculateInstallmentAmount, formatAmountString } from "./amountUtils";

export const mapToInstallmentContractPayload = (
  input: MovementInput
): InstallmentContractRequest => ({
  walletId: input.walletId,
  categoryId: input.categoryId,
  description: input.description.trim(),
  totalAmount: formatAmountString(input.amount),
  installmentsCount: input.installmentsCount ?? 2,
  installmentAmount: (() => {
    const calculated = calculateInstallmentAmount(
      input.amount,
      input.installmentsCount ?? 0
    );
    return calculated !== null ? formatAmountString(calculated) : undefined;
  })(),
  interval: input.interval,
  firstDueDate: input.depositedDate,
});
