import HttpClient from "@/api/httpClient";

export const CardStatementService = {
	getStatementsByMonth: (year: number, month: number) =>
		HttpClient.get(`/contracts/cards/statements/${year}/${month}`),

		getStatementByCardWalletId: (cardWalletId: string, year: number, month: number) =>
			HttpClient.get(`/contracts/cards/${cardWalletId}/statements/${year}/${month}`),
};
