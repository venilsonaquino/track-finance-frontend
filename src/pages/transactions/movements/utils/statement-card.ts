import { CardStatementListItem } from "@/api/dtos/contracts/cardStatementResponse";

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

const getDueInDays = (item: CardStatementListItem | null): number | null => {
	if (typeof item?.summary?.dueInDays === "number") {
		return item.summary.dueInDays;
	}

	const dueDateRaw = item?.summary?.dueDate ?? item?.statement?.dueDate;
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
	item: CardStatementListItem | null
) => {
	const amount = item?.summary?.totalAmount ?? item?.statement?.totalAmount ?? 0;
	const dueInDays = getDueInDays(item);

	return {
		title: getStatementTitle(item?.statement?.status),
		amount,
		dueInDays,
		dueLabel: getDueLabel(dueInDays),
		bankId: item?.statement?.bankId ?? null,
		walletName: item?.statement?.cardWalletName ?? "Cartão",
	};
};
