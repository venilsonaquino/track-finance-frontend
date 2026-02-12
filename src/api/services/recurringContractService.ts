import HttpClient from "@/api/httpClient";
import { RecurringContractRequest } from "@/api/dtos/contracts/recurringContractRequest";

export const RecurringContractService = {
  createRecurringContract: (contract: RecurringContractRequest) =>
    HttpClient.post("/contracts/recurring", contract),
  getRecurringContractById: (id: string) =>
    HttpClient.get(`/contracts/recurring/${id}`),
};
