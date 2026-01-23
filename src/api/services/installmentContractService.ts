import HttpClient from "@/api/httpClient";
import { InstallmentContractRequest } from "@/api/dtos/contracts/installmentContractRequest";

export const InstallmentContractService = {
  createInstallmentContract: (contract: InstallmentContractRequest) =>
    HttpClient.post("/contracts/installments", contract),
};
