import HttpClient from "@/api/httpClient";
import { UpdateContractOccurrenceRequest } from "@/api/dtos/contracts/updateContractOccurrenceRequest";

export const ContractOccurrenceService = {
  updateOccurrence: (
    contractId: string,
    dueDate: string,
    payload: UpdateContractOccurrenceRequest
  ) => HttpClient.patch(`/contracts/${contractId}/occurrences/${dueDate}`, payload),
};
