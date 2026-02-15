import HttpClient from "@/api/httpClient";
import { RecurringContractRequest } from "@/api/dtos/contracts/recurringContractRequest";

export const RecurringContractService = {
  createRecurringContract: (contract: RecurringContractRequest) =>
    HttpClient.post("/contracts/recurring", contract),
  getRecurringContractById: (id: string) =>
    HttpClient.get(`/contracts/recurring/${id}`),
  getRecurringContractDetailsById: (id: string) =>
    HttpClient.get(`/contracts/recurring/${id}/details`),
  payOccurrence: (contractId: string, dueDate: string) =>
    HttpClient.patch(`/contracts/recurring/${contractId}/occurrences/${dueDate}/pay`),
  updateOccurrenceAmount: (contractId: string, dueDate: string, amount: string) =>
    HttpClient.patch(`/contracts/recurring/${contractId}/occurrences/${dueDate}/amount`, { amount }),
  updateOccurrenceAmountFuture: (contractId: string, dueDate: string, amount: string) =>
    HttpClient.patch(`/contracts/recurring/${contractId}/occurrences/${dueDate}/amount/future`, { amount }),
  pauseContract: (contractId: string) =>
    HttpClient.patch(`/contracts/recurring/${contractId}/pause`),
  resumeContract: (contractId: string) =>
    HttpClient.patch(`/contracts/recurring/${contractId}/resume`),
  closeContract: (contractId: string) =>
    HttpClient.patch(`/contracts/recurring/${contractId}/close`),
};
