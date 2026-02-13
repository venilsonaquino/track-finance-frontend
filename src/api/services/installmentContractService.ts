import HttpClient from "@/api/httpClient";
import { InstallmentContractRequest } from "@/api/dtos/contracts/installmentContractRequest";

export const InstallmentContractService = {
  createInstallmentContract: (contract: InstallmentContractRequest) =>
    HttpClient.post("/contracts/installments", contract),
  getInstallmentContractById: (contractId: string) =>
    HttpClient.get(`/contracts/installments/${contractId}/details`),
  payOccurrence: (contractId: string, installmentIndex: number) =>
    HttpClient.patch(`/contracts/installments/${contractId}/occurrences/${installmentIndex}/pay`),
  updateOccurrenceAmount: (contractId: string, installmentIndex: number, amount: string) =>
    HttpClient.patch(`/contracts/installments/${contractId}/occurrences/${installmentIndex}/amount`, { amount }),
};
