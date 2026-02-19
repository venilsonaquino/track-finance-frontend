import HttpClient from "@/api/httpClient";

export const CardStatementService = {
	getStatementByMonth: (cardWalletId: string, year: number, month: number) =>
		HttpClient.get(`/contracts/cards/${cardWalletId}/statements/${year}/${month}`),
};
