export interface CardStatementInfo {
	id: string | null;
	cardWalletId: string;
	cardWalletName: string;
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

export interface CardStatementItem {
	id: string;
	source: string;
	contractId: string | null;
	dueDate: string;
	amount: number;
	status: string;
}

export interface CardStatementSummary {
	totalAmount: number;
	dueDate: string;
	dueInDays: number;
}

export interface CardStatementResponse {
	statement: CardStatementInfo | null;
	items: CardStatementItem[];
	summary?: CardStatementSummary | null;
}
