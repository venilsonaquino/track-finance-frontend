import { InstallmentContractRequest } from "@/api/dtos/contracts/installmentContractRequest";
import { MovementInput } from "../types";
import { calculateInstallmentAmount, calculateInstallmentSchedule, formatAmountString } from "./amountUtils";

export const mapToInstallmentContractPayload = (
  input: MovementInput
): InstallmentContractRequest => ({
  walletId: input.walletId,
  categoryId: input.categoryId,
  description: input.description.trim(),
  totalAmount: formatAmountString(input.amount),
  installmentsCount: input.installmentsCount ?? 2,
  installmentAmount: (() => {
    const count = input.installmentsCount ?? 0;
    const breakdown = calculateInstallmentSchedule(input.amount, count);
    const calculated = calculateInstallmentAmount(input.amount, count);
    if (!breakdown || calculated === null) return undefined;
    return breakdown.remainder === 0 ? formatAmountString(calculated) : undefined;
  })(),
  interval: input.interval,
  firstDueDate: input.depositedDate,
});
