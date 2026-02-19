import { CardStatementResponse } from "@/api/dtos/contracts/cardStatementResponse";

const getStatementTitle = (status?: string | null): string => {
	switch (String(status ?? "").toUpperCase()) {
		case "OPEN":
			return "Fatura em aberto";
		case "PAID":
			return "Fatura paga";
		case "CLOSED":
			return "Fatura fechada";
		default:
			return "Fatura do cartão";
	}
};

const getDueInDays = (statement: CardStatementResponse | null): number | null => {
	if (typeof statement?.summary?.dueInDays === "number") {
		return statement.summary.dueInDays;
	}

	const dueDateRaw = statement?.summary?.dueDate ?? statement?.statement?.dueDate;
	if (!dueDateRaw) return null;

	const dueDate = new Date(`${dueDateRaw}T00:00:00`);
	if (Number.isNaN(dueDate.getTime())) return null;

	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const diffMs = dueDate.getTime() - today.getTime();
	return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

const getDueLabel = (dueInDays: number | null): string => {
	if (dueInDays === null) return "-";
	if (dueInDays < 0) {
		const days = Math.abs(dueInDays);
		return `Vencida há ${days} ${days === 1 ? "dia" : "dias"}`;
	}
	if (dueInDays === 0) return "Vence hoje";
	return `${dueInDays} ${dueInDays === 1 ? "dia" : "dias"}`;
};

export const buildStatementCardView = (
	statement: CardStatementResponse | null,
	fallbackWalletName?: string
) => {
	const amount = statement?.summary?.totalAmount ?? statement?.statement?.totalAmount ?? 0;
	const dueInDays = getDueInDays(statement);

	return {
		title: getStatementTitle(statement?.statement?.status),
		amount,
		dueInDays,
		dueLabel: getDueLabel(dueInDays),
		walletName: statement?.statement?.cardWalletName ?? fallbackWalletName ?? "Cartão",
	};
};
