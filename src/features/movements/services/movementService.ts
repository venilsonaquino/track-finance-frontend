import { TransactionService } from "@/api/services/transactionService";
import { RecurringContractService } from "@/api/services/recurringContractService";
import { InstallmentContractService } from "@/api/services/installmentContractService";
import { CreateMovementInput, CreateMovementResult } from "../types";
import { mapToTransactionPayload } from "../mappers/transactionMapper";
import { mapToRecurringContractPayload } from "../mappers/recurringContractMapper";
import { mapToInstallmentContractPayload } from "../mappers/installmentContractMapper";

const extractId = (data: unknown): string => {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as { id?: string };
    return first?.id ?? "";
  }
  if (typeof data === "object" && "id" in (data as Record<string, unknown>)) {
    return String((data as Record<string, unknown>).id ?? "");
  }
  return "";
};

export const createMovement = async (
  input: CreateMovementInput
): Promise<CreateMovementResult> => {
  const { kind, ...movement } = input;

  if (kind === "installment") {
    const payload = mapToInstallmentContractPayload(movement);
    const response = await InstallmentContractService.createInstallmentContract(payload);
    return { id: extractId(response.data), kind };
  }

  if (kind === "recurring") {
    const payload = mapToRecurringContractPayload(movement);
    const response = await RecurringContractService.createRecurringContract(payload);
    return { id: extractId(response.data), kind };
  }

  const payload = mapToTransactionPayload(movement);
  const response = await TransactionService.createTransaction(payload);
  return { id: extractId(response.data), kind };
};
