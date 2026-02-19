export interface CardStatementInfo {
	id: string | null;
	cardWalletId: string;
	cardWalletName: string;
	bankId?: string | null;
	referenceMonth: string;
	billingMonth?: string;
	periodStart: string;
	periodEnd: string;
	dueDate: string;
	status: string;
	totalAmount: number;
	paymentWalletId: string | null;
	paymentTransactionId: string | null;
}

export interface CardStatementSummary {
	totalAmount: number;
	dueDate: string;
	dueInDays: number;
}

export interface CardStatementListItem {
	statement: CardStatementInfo | null;
	summary: CardStatementSummary | null;
}

export interface CardStatementsByMonthResponse {
	period: {
		year: number;
		month: number;
	};
	items: CardStatementListItem[];
}
