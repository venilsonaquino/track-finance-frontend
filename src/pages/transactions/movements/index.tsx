import PageBreadcrumbNav from "@/components/BreadcrumbNav";
import { getAmountDisplay } from "@/utils/transaction-utils";
import { useTransactions } from "../hooks/use-transactions";
import { useCallback, useEffect, useMemo, useState } from "react";
import TransactionsRecordResponse, {
	SummaryBadge,
	SummaryMetric,
} from "@/api/dtos/transaction/transactionRecordResponse";
import { Button } from "@/components/ui/button";
import { ChevronRight, CreditCard, MoreVertical, Tag, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { TransactionResponse } from "@/api/dtos/transaction/transactionResponse";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BankLogo } from "@/components/bank-logo";
import { DynamicIcon } from "lucide-react/dynamic";
import { MonthYearPicker } from "./components/MonthYearPicker";
import { DateUtils } from "@/utils/date-utils";
import { FilterSheet } from "./components/FilterSheet";
import { CreateTransactionDialog } from "./components/CreateTransactionDialog";
import { EditTransactionDialog } from "./components/EditTransactionDialog";
import { DeleteTransactionDialog } from "./components/DeleteTransactionDialog";
import { ReverseTransactionDialog } from "./components/ReverseTransactionDialog";
import { ContractInstallmentDetailsDrawer } from "./components/ContractInstalltmentDetailsDrawer";
import { ContractRecurringDetailsDrawer } from "./components/ContractRecurringDetailsDrawer";
import { toast } from "sonner";
import { formatCurrency, maskCurrencyInput, parseCurrencyInput } from "@/utils/currency-utils";
import { useCategories } from "../hooks/use-categories";
import { useWallets } from "../hooks/use-wallets";
import { InstallmentContractService } from "@/api/services/installmentContractService";
import { RecurringContractService } from "@/api/services/recurringContractService";
import { buildMovementMenuActions, MovementRowActions } from "./actions-config";
import { CardStatementService } from "@/api/services/cardStatementService";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardStatementResponse } from "@/api/dtos/contracts/cardStatementResponse";
import { buildStatementCardView } from "./utils/statement-card";

const TransactionsPage = () => {
	const { getTransactions, deleteTransaction, reverseTransaction } = useTransactions();
	const { categories } = useCategories();
	const { wallets } = useWallets();
	type TransactionsRangeResponse = TransactionsRecordResponse & {
		period?: { year?: number; month?: number; start?: string; end?: string };
	};
	const [transactionsData, setTransactionsData] = useState<TransactionsRangeResponse | null>(null);
	const [currentDate, setCurrentDate] = useState(new Date());
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editingTransaction, setEditingTransaction] = useState<TransactionResponse | null>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [deletingTransaction, setDeletingTransaction] = useState<TransactionResponse | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isReverseDialogOpen, setIsReverseDialogOpen] = useState(false);
	const [reversingTransaction, setReversingTransaction] = useState<TransactionResponse | null>(null);
	const [isReversing, setIsReversing] = useState(false);
	const [isContractInstallmentDrawerOpen, setIsContractInstallmentDrawerOpen] = useState(false);
	const [contractTransaction, setContractTransaction] = useState<TransactionResponse | null>(null);
	const [isContractRecurringDrawerOpen, setIsContractRecurringDrawerOpen] = useState(false);
	const [recurringContractTransaction, setRecurringContractTransaction] = useState<TransactionResponse | null>(null);
	const [isMarkingAsPaid, setIsMarkingAsPaid] = useState(false);
	const [isAdjustAmountDialogOpen, setIsAdjustAmountDialogOpen] = useState(false);
	const [adjustingTransaction, setAdjustingTransaction] = useState<TransactionResponse | null>(null);
	const [adjustAmountInput, setAdjustAmountInput] = useState("");
	const [adjustScope, setAdjustScope] = useState<"single" | "future">("single");
	const [isAdjustingAmount, setIsAdjustingAmount] = useState(false);
	const [cardStatement, setCardStatement] = useState<CardStatementResponse | null>(null);
	const [isCardStatementLoading, setIsCardStatementLoading] = useState(false);
	const [activeFilters, setActiveFilters] = useState<{
		startDate: string;
		endDate: string;
		categoryIds: string[];
		timeline: "realizadas" | "futuras" | "todas";
		periodPreset: "month" | "last30" | "custom";
		walletId: string | null;
	} | null>(null);

	const selectedCardWallet = useMemo(() => {
		if (activeFilters?.walletId) {
			const selectedWallet = wallets.find(wallet => wallet.id === activeFilters.walletId) ?? null;
			return selectedWallet?.financialType === "CREDIT_CARD" ? selectedWallet : null;
		}

		return wallets.find(wallet => wallet.financialType === "CREDIT_CARD") ?? null;
	}, [activeFilters?.walletId, wallets]);

	const normalizeTransactionsResponse = (
		data: unknown
	): TransactionsRangeResponse => {
		const emptyMetric: SummaryMetric = {
			amount: 0,
			badge: { trend: "FLAT", amount: 0, reason: "NO_CHANGE" },
		};
		const emptySummary = {
			income: emptyMetric,
			expense: emptyMetric,
			balance: emptyMetric,
		};

		if (Array.isArray(data)) {
			return {
				records: [
					{
						date: "",
						endOfDayBalance: null,
						transactions: data as TransactionResponse[],
					},
				],
				summary: emptySummary,
			};
		}

		if (data && typeof data === "object") {
			const asAny = data as Partial<TransactionsRangeResponse> & {
				transactions?: TransactionResponse[];
				data?: TransactionResponse[];
				period?: { year?: number; month?: number; start?: string; end?: string };
			};

			const list = asAny.items ?? asAny.transactions ?? asAny.data;
			if (Array.isArray(list)) {
				return {
					items: list,
					records: Array.isArray(asAny.records)
						? asAny.records
						: [
								{
									date: "",
									endOfDayBalance: null,
									transactions: list,
								},
							],
					summary: asAny.summary ?? emptySummary,
					period: asAny.period,
				};
			}
		}

		return { items: [], records: [], summary: emptySummary };
	};

	const getPeriodLabel = (date: Date) => {
		const months = [
			"Janeiro",
			"Fevereiro",
			"Março",
			"Abril",
			"Maio",
			"Junho",
			"Julho",
			"Agosto",
			"Setembro",
			"Outubro",
			"Novembro",
			"Dezembro",
		];
		return `${months[date.getMonth()]} ${date.getFullYear()}`;
	};

	const getPeriodLabelFromResponse = (period?: { year?: number; month?: number }) => {
		if (!period?.year || !period?.month) return null;
		const months = [
			"Janeiro",
			"Fevereiro",
			"Março",
			"Abril",
			"Maio",
			"Junho",
			"Julho",
			"Agosto",
			"Setembro",
			"Outubro",
			"Novembro",
			"Dezembro",
		];
		const index = Math.max(1, Math.min(12, period.month)) - 1;
		return `${months[index]} ${period.year}`;
	};

	const loadTransactions = useCallback(async () => {
		try {
			let startDate: string;
			let endDate: string;
			let view: "realized" | "future" | "all" = "all";
			let referenceDate: Date;

			if (activeFilters) {
				startDate = activeFilters.startDate;
				endDate = activeFilters.endDate;
				referenceDate = new Date(`${activeFilters.startDate}T00:00:00`);
				if (activeFilters.timeline === "realizadas") {
					view = "realized";
				} else if (activeFilters.timeline === "futuras") {
					view = "future";
				}
			} else {
				const monthDates = DateUtils.getMonthStartAndEnd(currentDate);
				startDate = monthDates.startDate;
				endDate = monthDates.endDate;
				referenceDate = currentDate;
			}

			const statementMonth = referenceDate.getMonth() + 1;
			const statementYear = referenceDate.getFullYear();
			const hasSelectedCard = Boolean(selectedCardWallet?.id);

			if (hasSelectedCard) {
				setIsCardStatementLoading(true);
			} else {
				setCardStatement(null);
			}

			const [currentResponse, statementResponse] = await Promise.all([
				getTransactions(startDate, endDate, view),
				hasSelectedCard
					? CardStatementService.getStatementByMonth(selectedCardWallet!.id!, statementYear, statementMonth)
							.then(response => response.data as CardStatementResponse)
							.catch((error) => {
								console.error("Erro ao carregar fatura do cartão:", error);
								return null;
							})
					: Promise.resolve(null),
			]);

			setTransactionsData(normalizeTransactionsResponse(currentResponse));
			setCardStatement(statementResponse);
		} catch (error) {
			console.error("Erro ao carregar transações:", error);
		} finally {
			setIsCardStatementLoading(false);
		}
	}, [activeFilters, currentDate, getTransactions, selectedCardWallet]);

	useEffect(() => {
		loadTransactions();
	}, [loadTransactions]);

	const handleApplyFilters = (filters: {
		startDate: string;
		endDate: string;
		categoryIds: string[];
		timeline: "realizadas" | "futuras" | "todas";
		periodPreset: "month" | "last30" | "custom";
		walletId: string | null;
	} | null) => {
		setActiveFilters(filters);
	};

	const handleMonthYearChange = (date: Date) => {
		setCurrentDate(date);
		setActiveFilters(null);
	};

	const handleOpenEdit = (transaction: TransactionResponse) => {
		setEditingTransaction(transaction);
		setIsEditDialogOpen(true);
	};

	const handleOpenDelete = (transaction: TransactionResponse) => {
		setDeletingTransaction(transaction);
		setIsDeleteDialogOpen(true);
	};

	const handleDeleteDialogChange = (open: boolean) => {
		setIsDeleteDialogOpen(open);
		if (!open) {
			setDeletingTransaction(null);
		}
	};

	const handleOpenReverse = (transaction: TransactionResponse) => {
		if (isReversedTransaction(transaction)) {
			toast.info("Esta movimentação já está estornada.");
			return;
		}
		if (!resolvePostedTransactionId(transaction)) {
			toast.error("Não foi possível identificar a transação para estorno.");
			return;
		}
		setReversingTransaction(transaction);
		setIsReverseDialogOpen(true);
	};

	const handleReverseDialogChange = (open: boolean) => {
		setIsReverseDialogOpen(open);
		if (!open) {
			setReversingTransaction(null);
		}
	};

	const handleEditDialogChange = (open: boolean) => {
		setIsEditDialogOpen(open);
		if (!open) {
			setEditingTransaction(null);
		}
	};

	const handleConfirmDelete = async () => {
		if (!deletingTransaction?.id) return;
		setIsDeleting(true);
		try {
			await deleteTransaction(deletingTransaction.id);
			toast.success("Movimentação excluída com sucesso.");
			handleDeleteDialogChange(false);
			await loadTransactions();
		} catch (error) {
			console.error(error);
			toast.error("Não foi possível excluir a movimentação.");
		} finally {
			setIsDeleting(false);
		}
	};

	const allTransactions =
		transactionsData?.items ??
		transactionsData?.records?.flatMap(record => record.transactions) ??
		[];
	const filteredTransactions = useMemo(() => {
		let filtered = allTransactions;
		if (activeFilters?.walletId) {
			filtered = filtered.filter(transaction => transaction.wallet?.id === activeFilters.walletId);
		}
		if (activeFilters?.categoryIds?.length) {
			filtered = filtered.filter(transaction => {
				const categoryId = transaction.category?.id;
				return categoryId ? activeFilters.categoryIds.includes(categoryId) : false;
			});
		}
		return filtered;
	}, [activeFilters, allTransactions]);

	const categoryById = useMemo(() => {
		return new Map((categories ?? []).map(category => [category.id, category]));
	}, [categories]);

	const walletById = useMemo(() => {
		return new Map((wallets ?? []).map(wallet => [wallet.id, wallet]));
	}, [wallets]);

	type MovementItem = TransactionResponse;

	const getActions = (transaction: TransactionResponse) => {
		const asAny = transaction as unknown as Record<string, unknown>;
		const raw = (asAny.actions ?? {}) as Record<string, unknown>;
		const parsed: MovementRowActions = {
			canMarkAsPaid: Boolean(raw.canMarkAsPaid),
			canReverse: Boolean(raw.canReverse),
			canEditDueDate: Boolean(raw.canEditDueDate),
			canAdjustAmount: Boolean(raw.canAdjustAmount),
			canSkip: Boolean(raw.canSkip),
			canViewContract: Boolean(raw.canViewContract),
		};
		return parsed;
	};

	const resolveSource = (transaction: TransactionResponse): "transaction" | "installment" | "recurring" | null => {
		const asAny = transaction as unknown as Record<string, unknown>;
		const raw = transaction.source ?? (typeof asAny.source === "string" ? asAny.source : null);
		if (raw === "transaction" || raw === "installment" || raw === "recurring") return raw;
		return null;
	};

	const resolveOccurrenceStatus = (transaction: TransactionResponse): "SCHEDULED" | "POSTED" | "CANCELLED" | "SKIPPED" | null => {
		const asAny = transaction as unknown as Record<string, unknown>;
		const raw = transaction.occurrenceStatus ?? (typeof asAny.occurrenceStatus === "string" ? asAny.occurrenceStatus : null);
		if (raw === "SCHEDULED" || raw === "POSTED" || raw === "CANCELLED" || raw === "SKIPPED") return raw;
		return null;
	};

	const getOccurrenceTransactionId = (transaction: TransactionResponse): string | null | undefined => {
		const asAny = transaction as unknown as Record<string, unknown>;
		return (
			(typeof transaction.transactionId === "string" ? transaction.transactionId : transaction.transactionId === null ? null : undefined) ??
			(typeof asAny.transactionId === "string" ? asAny.transactionId : asAny.transactionId === null ? null : undefined) ??
			(typeof asAny.transaction_id === "string" ? asAny.transaction_id : asAny.transaction_id === null ? null : undefined)
		);
	};

	const isScheduledOccurrence = (transaction: TransactionResponse) => {
		const source = resolveSource(transaction);
		const occurrenceStatus = resolveOccurrenceStatus(transaction);
		if (source === "installment" || source === "recurring") {
			return occurrenceStatus === "SCHEDULED" || getOccurrenceTransactionId(transaction) == null;
		}

		const occurrenceTransactionId = getOccurrenceTransactionId(transaction);
		const hasContractRelation =
			Boolean(transaction.contractId || transaction.contract_id) ||
			Boolean(transaction.installmentContractId || transaction.installment_contract_id) ||
			Boolean(transaction.recurringContractId || transaction.recurring_contract_id) ||
			Boolean(transaction.isInstallment || transaction.isRecurring);

		// Occurrence is "scheduled" when it belongs to a contract and still has no generated transaction id.
		return occurrenceTransactionId !== undefined ? occurrenceTransactionId === null && hasContractRelation : hasContractRelation;
	};

	const isReversedTransaction = (transaction: TransactionResponse) => {
		return transaction.transactionStatus === "REVERSED";
	};

	const resolvePostedTransactionId = (transaction: TransactionResponse): string | null => {
		const asAny = transaction as unknown as Record<string, unknown>;
		const camel = typeof asAny.transactionId === "string" ? asAny.transactionId.trim() : "";
		if (camel) return camel;
		const snake = typeof asAny.transaction_id === "string" ? asAny.transaction_id.trim() : "";
		if (snake) return snake;
		const direct = typeof transaction.id === "string" ? transaction.id.trim() : "";
		return direct || null;
	};

	const isSimplePaidTransaction = (transaction: TransactionResponse) =>
		resolveSource(transaction) === "transaction";

	const resolveContractKind = (transaction: TransactionResponse): "RECURRING" | "INSTALLMENT" | null => {
		const asAny = transaction as unknown as Record<string, unknown>;
		const rawTypeRaw =
			transaction.contractType ??
			transaction.contract_type ??
			(typeof asAny.contractType === "string" ? asAny.contractType : null) ??
			(typeof asAny.contract_type === "string" ? asAny.contract_type : null);
		const rawType = typeof rawTypeRaw === "string" ? rawTypeRaw.toUpperCase() : null;

		if (rawType === "RECURRING") return "RECURRING";
		if (rawType === "INSTALLMENT") return "INSTALLMENT";
		const source = resolveSource(transaction);
		if (source === "installment") return "INSTALLMENT";
		if (source === "recurring") return "RECURRING";
		return null;
	};

	const handleMarkAsPaid = (transaction: TransactionResponse) => {
		const asAny = transaction as unknown as Record<string, unknown>;
		const resolveInstallmentContractId = () =>
			transaction.installmentContractId ??
			transaction.installment_contract_id ??
			transaction.contractId ??
			transaction.contract_id ??
			(typeof asAny.installmentContractId === "string" ? asAny.installmentContractId : null) ??
			(typeof asAny.installment_contract_id === "string" ? asAny.installment_contract_id : null) ??
			(typeof asAny.contractId === "string" ? asAny.contractId : null) ??
			(typeof asAny.contract_id === "string" ? asAny.contract_id : null) ??
			null;

		const resolveRecurringContractId = () =>
			transaction.recurringContractId ??
			transaction.recurring_contract_id ??
			transaction.contractId ??
			transaction.contract_id ??
			(typeof asAny.recurringContractId === "string" ? asAny.recurringContractId : null) ??
			(typeof asAny.recurring_contract_id === "string" ? asAny.recurring_contract_id : null) ??
			(typeof asAny.contractId === "string" ? asAny.contractId : null) ??
			(typeof asAny.contract_id === "string" ? asAny.contract_id : null) ??
			null;

		const resolveInstallmentIndex = (): number | null => {
			const raw =
				(typeof transaction.installmentIndex === "number" ? transaction.installmentIndex : null) ??
				(typeof asAny.installmentIndex === "number" ? asAny.installmentIndex : null) ??
				(typeof asAny.installment_index === "number" ? asAny.installment_index : null) ??
				(typeof transaction.installmentNumber === "number" ? transaction.installmentNumber : null);

			if (raw && Number.isInteger(raw) && raw > 0) return raw;
			return null;
		};

		const resolveDueDate = (): string | null => {
			const raw =
				(typeof transaction.dueDate === "string" ? transaction.dueDate : null) ??
				(typeof asAny.dueDate === "string" ? asAny.dueDate : null) ??
				(typeof asAny.due_date === "string" ? asAny.due_date : null) ??
				transaction.depositedDate ??
				transaction.transactionDate ??
				null;
			if (!raw) return null;
			if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
			const parsed = new Date(raw);
			if (Number.isNaN(parsed.getTime())) return null;
			return parsed.toISOString().slice(0, 10);
		};

		const run = async () => {
			if (isMarkingAsPaid) return;
			setIsMarkingAsPaid(true);
			try {
				const kind = resolveContractKind(transaction);
				if (kind === "INSTALLMENT") {
					const contractId = resolveInstallmentContractId();
					const installmentIndex = resolveInstallmentIndex();
					if (!contractId || !installmentIndex) {
						toast.error("Não foi possível identificar contrato/índice da parcela.");
						return;
					}
					await InstallmentContractService.payOccurrence(contractId, installmentIndex);
				} else if (kind === "RECURRING") {
					const contractId = resolveRecurringContractId();
					const dueDate = resolveDueDate();
					if (!contractId || !dueDate) {
						toast.error("Não foi possível identificar contrato/data da ocorrência.");
						return;
					}
					await RecurringContractService.payOccurrence(contractId, dueDate);
				} else {
					toast.error("Movimentação sem tipo de contrato para marcar como pago.");
					return;
				}

				toast.success("Ocorrência marcada como paga com sucesso.");
				await loadTransactions();
			} catch (error) {
				console.error(error);
				toast.error("Não foi possível marcar ocorrência como paga.");
			} finally {
				setIsMarkingAsPaid(false);
			}
		};

		void run();
	};

	const handleEditDueDate = (transaction: TransactionResponse) => {
		toast.info(`Editar vencimento: ${transaction.description}`);
	};

	const handleIgnoreThisMonth = (transaction: TransactionResponse) => {
		toast.info(`Ignorar este mês: ${transaction.description}`);
	};

	const toIsoDate = (value?: string | null) => {
		if (!value) return null;
		if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
		if (value.includes("T")) {
			const candidate = value.slice(0, 10);
			if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return candidate;
		}
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return null;
		return parsed.toISOString().slice(0, 10);
	};

	const resolveContractIdForAdjust = (transaction: TransactionResponse) => {
		const asAny = transaction as unknown as Record<string, unknown>;
		return (
			transaction.contractId ??
			transaction.contract_id ??
			transaction.installmentContractId ??
			transaction.installment_contract_id ??
			transaction.recurringContractId ??
			transaction.recurring_contract_id ??
			(typeof asAny.contractId === "string" ? asAny.contractId : null) ??
			(typeof asAny.contract_id === "string" ? asAny.contract_id : null) ??
			(typeof asAny.installmentContractId === "string" ? asAny.installmentContractId : null) ??
			(typeof asAny.recurringContractId === "string" ? asAny.recurringContractId : null) ??
			null
		);
	};

	const resolveInstallmentIndexForAdjust = (transaction: TransactionResponse): number | null => {
		const asAny = transaction as unknown as Record<string, unknown>;
		const raw =
			(typeof transaction.installmentIndex === "number" ? transaction.installmentIndex : null) ??
			(typeof asAny.installmentIndex === "number" ? asAny.installmentIndex : null) ??
			(typeof asAny.installment_index === "number" ? asAny.installment_index : null) ??
			(typeof transaction.installmentNumber === "number" ? transaction.installmentNumber : null);
		return raw && Number.isInteger(raw) && raw > 0 ? raw : null;
	};

	const resolveDueDateForAdjust = (transaction: TransactionResponse): string | null => {
		const asAny = transaction as unknown as Record<string, unknown>;
		const raw =
			(typeof transaction.dueDate === "string" ? transaction.dueDate : null) ??
			(typeof asAny.dueDate === "string" ? asAny.dueDate : null) ??
			(typeof asAny.due_date === "string" ? asAny.due_date : null) ??
			transaction.depositedDate ??
			transaction.transactionDate ??
			null;
		return toIsoDate(raw);
	};

	const handleOpenAdjustAmount = (transaction: TransactionResponse) => {
		const amount = Math.abs(Number(transaction.amount) || 0);
		setAdjustingTransaction(transaction);
		setAdjustAmountInput(maskCurrencyInput(String(Math.round(amount * 100))));
		setAdjustScope("single");
		setIsAdjustAmountDialogOpen(true);
	};

	const handleAdjustAmountDialogChange = (open: boolean) => {
		setIsAdjustAmountDialogOpen(open);
		if (!open) {
			setAdjustingTransaction(null);
			setAdjustAmountInput("");
			setAdjustScope("single");
		}
	};

	const handleConfirmAdjustAmount = async () => {
		if (!adjustingTransaction) return;

		const contractId = resolveContractIdForAdjust(adjustingTransaction);
		if (!contractId) {
			toast.error("Não foi possível identificar o contrato.");
			return;
		}

		const amount = parseCurrencyInput(adjustAmountInput);
		if (Number.isNaN(amount) || amount <= 0) {
			toast.error("Informe um valor válido.");
			return;
		}

		const kind = resolveContractKind(adjustingTransaction);
		setIsAdjustingAmount(true);
		try {
			if (kind === "INSTALLMENT") {
				const installmentIndex = resolveInstallmentIndexForAdjust(adjustingTransaction);
				if (!installmentIndex) {
					toast.error("Não foi possível identificar o índice da parcela.");
					return;
				}
				await InstallmentContractService.updateOccurrenceAmount(contractId, installmentIndex, amount.toFixed(2));
			} else if (kind === "RECURRING") {
				const dueDate = resolveDueDateForAdjust(adjustingTransaction);
				if (!dueDate) {
					toast.error("Não foi possível identificar a data da ocorrência.");
					return;
				}
				if (adjustScope === "future") {
					await RecurringContractService.updateOccurrenceAmountFuture(contractId, dueDate, amount.toFixed(2));
				} else {
					await RecurringContractService.updateOccurrenceAmount(contractId, dueDate, amount.toFixed(2));
				}
			} else {
				toast.error("Ajuste de valor disponível apenas para ocorrências de contrato.");
				return;
			}

			toast.success("Valor atualizado com sucesso.");
			handleAdjustAmountDialogChange(false);
			await loadTransactions();
		} catch (error) {
			console.error(error);
			toast.error("Não foi possível ajustar o valor.");
		} finally {
			setIsAdjustingAmount(false);
		}
	};

	const handleViewContract = (transaction: TransactionResponse) => {
		const kind = resolveContractKind(transaction);
		if (kind === "RECURRING") {
			setContractTransaction(null);
			setIsContractInstallmentDrawerOpen(false);
			setRecurringContractTransaction(transaction);
			setIsContractRecurringDrawerOpen(true);
			return;
		}
		setRecurringContractTransaction(null);
		setIsContractRecurringDrawerOpen(false);
		setContractTransaction(transaction);
		setIsContractInstallmentDrawerOpen(true);
	};

	const handleContractInstallmentDrawerChange = (open: boolean) => {
		setIsContractInstallmentDrawerOpen(open);
		if (!open) {
			setContractTransaction(null)	;
		}
	};

	const handleContractRecurringDrawerChange = (open: boolean) => {
		setIsContractRecurringDrawerOpen(open);
		if (!open) {
			setRecurringContractTransaction(null);
		}
	};

	const handleConfirmReverse = async () => {
		if (!reversingTransaction) {
			toast.error("Não foi possível estornar esta movimentação.");
			return;
		}
		const targetTransactionId = resolvePostedTransactionId(reversingTransaction);
		if (!targetTransactionId) {
			toast.error("Não foi possível identificar a transação para estorno.");
			return;
		}
		if (isReversedTransaction(reversingTransaction)) {
			toast.info("Esta movimentação já está estornada.");
			return;
		}

		setIsReversing(true);
		try {
			await reverseTransaction(targetTransactionId);
			toast.success("Movimentação estornada com sucesso.");
			handleReverseDialogChange(false);
			await loadTransactions();
		} catch (error) {
			console.error(error);
			toast.error("Não foi possível estornar a movimentação.");
		} finally {
			setIsReversing(false);
		}
	};

	const summaryFromApi = transactionsData?.summary;
	const fallbackBadge: SummaryBadge = { trend: "FLAT", amount: 0, reason: "NO_CHANGE" };
	const fallbackMetric: SummaryMetric = { amount: 0, badge: fallbackBadge };
	const incomeMetric = summaryFromApi?.income ?? fallbackMetric;
	const expenseMetric = summaryFromApi?.expense ?? fallbackMetric;
	const balanceMetric = summaryFromApi?.balance ?? fallbackMetric;

	const incomeDisplay = getAmountDisplay(incomeMetric.amount, "INCOME");
	const expenseDisplay = getAmountDisplay(expenseMetric.amount, "EXPENSE");
	const balanceDisplay = getAmountDisplay(balanceMetric.amount);

	const responsePeriodLabel = getPeriodLabelFromResponse(transactionsData?.period);
	const periodLabel = responsePeriodLabel ?? getPeriodLabel(currentDate);
	const adjustingContractKind = adjustingTransaction ? resolveContractKind(adjustingTransaction) : null;
	const statementCardView = useMemo(
		() => buildStatementCardView(cardStatement, selectedCardWallet?.name),
		[cardStatement, selectedCardWallet?.name]
	);
	const hasStatementItems = (cardStatement?.items?.length ?? 0) > 0;
	const badgeClassName = (badge: SummaryBadge, kind: "income" | "expense" | "balance") => {
		if (badge.trend === "FLAT") return "text-muted-foreground";
		if (kind === "expense") return badge.trend === "UP" ? "text-red-500" : "text-emerald-500";
		return badge.trend === "UP" ? "text-emerald-500" : "text-red-500";
	};
	const badgeAmountLabel = (badge: SummaryBadge) => {
		const icon = badge.trend === "UP" ? "▲" : badge.trend === "DOWN" ? "▼" : "▲";
		const sign = badge.trend === "DOWN" ? "-" : "+";
		return `${icon} ${sign}${formatCurrency(Math.abs(badge.amount))}`;
	};
	const badgeReasonLabel = (reason: SummaryBadge["reason"]) => {
		switch (reason) {
			case "NO_BASELINE":
				return "Sem base comparativa";
			case "NO_CHANGE":
				return "Sem variação no período";
			case "NEW_SPEND":
				return "Novo gasto no período";
			case "NEW_INCOME":
				return "Primeira receita no período";
			case "NEW_BALANCE":
				return "Novo saldo no período";
			case "INCREASE_VS_PREVIOUS":
				return "Aumento vs período anterior";
			case "DECREASE_VS_PREVIOUS":
				return "Queda vs período anterior";
			default:
				return "-";
		}
	};

	const columns: ColumnDef<TransactionResponse>[] = [
		{
			accessorKey: "depositedDate",
			header: () => <div className="text-left">Data</div>,
			size: 100,
			cell: ({ row }) => {
				const transaction = row.original as TransactionResponse & { date?: string };
				const rawDate =
					transaction.depositedDate ||
					transaction.transactionDate ||
					transaction.date ||
					(row.getValue("depositedDate") as string | undefined);
				if (!rawDate) {
					return <div className="text-left">-</div>;
				}
				const parsed = new Date(rawDate);
				if (Number.isNaN(parsed.getTime())) {
					return <div className="text-left">-</div>;
				}
				return <div className="text-left">{parsed.toLocaleDateString("pt-BR")}</div>;
			},
		},
		{
			accessorKey: "description",
			header: () => <div className="text-center">Descrição</div>,
			size: 300,
			cell: ({ row }) => {
				const description = row.getValue("description") as string;
				
				return (
					<div className="flex items-center justify-center text-center">
						<span title={description} className="truncate">
							{description}
						</span>
					</div>
				);
			},
		},
		{
			accessorKey: "category",
			header: () => <div className="text-start">Categoria</div>,
			size: 150,
			cell: ({ row }) => {
				const category = row.getValue("category") as any;
				if (!category) return <div className="text-center">-</div>;
				const resolvedCategory = category?.id ? categoryById.get(category.id) ?? category : category;
				const hasColor = Boolean(resolvedCategory?.color);
				const hasIcon = Boolean(resolvedCategory?.icon);

				return (
					<div
						className="flex items-center"
						style={{ minHeight: 40 }}
					>
						<div className="flex-shrink-0 w-10 flex justify-center items-center">
							<div
								className={`w-10 h-10 rounded-full flex items-center justify-center ${
									hasColor ? "text-white" : "bg-muted text-muted-foreground"
								}`}
								style={hasColor ? { backgroundColor: resolvedCategory.color } : undefined}
							>
								{hasIcon ? (
									<DynamicIcon
										name={resolvedCategory.icon as any}
										size={22}
										className="text-white"
									/>
								) : (
									<Tag className="h-5 w-5" />
								)}
							</div>
						</div>
						<span className="ml-2 text-sm truncate">{resolvedCategory.name}</span>
					</div>
				);
			},
		},
		{
			accessorKey: "wallet",
			header: () => <div className="text-center">Conta</div>,
			size: 150,
			cell: ({ row }) => {
				const wallet = row.getValue("wallet") as any;
				if (!wallet) return <div className="text-center">-</div>;
				const resolvedWallet = wallet?.id ? walletById.get(wallet.id) ?? wallet : wallet;
				
				return (
					<div className="text-center">
						<div className="flex items-center justify-center">
							<BankLogo 
								bankId={resolvedWallet.bankId} 
								size="md" 
								fallbackIcon={<Wallet className="w-7 h-4" />}
								className="mr-2 flex-shrink-0"
							/>
							<span className="truncate">{resolvedWallet.name}</span>
						</div>
					</div>
				);
			},
		},
		{
			accessorKey: "amount",
			header: () => <div className="text-right">Valor</div>,
			size: 120,
			cell: ({ row }) => {
				const rawAmount = Number(row.getValue("amount"));
				const transaction = row.original as MovementItem;
				const asAny = transaction as unknown as Record<string, unknown>;
				const directionRaw =
					transaction.direction ??
					(typeof asAny.direction === "string" ? asAny.direction : undefined);
				const direction =
					directionRaw === "INCOME" || directionRaw === "EXPENSE" ? directionRaw : undefined;
				const normalizedAmount = Number.isFinite(rawAmount) ? Math.abs(rawAmount) : 0;
				const amountForDisplay =
					direction === "INCOME"
						? normalizedAmount
						: direction === "EXPENSE"
							? -normalizedAmount
							: rawAmount;
				const typeForDisplay =
					direction === "INCOME" || direction === "EXPENSE"
						? direction
						: transaction.transactionType;
				const isScheduled = isScheduledOccurrence(transaction);
				const { text: amountText, className: amountClass } = getAmountDisplay(
					amountForDisplay,
					typeForDisplay
				);
				
				return (
					<div className="text-right">
						<span
							className={`${amountClass} ${isScheduled ? "opacity-80" : ""}`}
							title={isScheduled ? "Ainda não debitada" : undefined}
						>
							{amountText}
						</span>
					</div>
				);
			},
		},
		{
			id: "actions",
			header: () => <div className="text-right">Ações</div>,
			size: 80,
			cell: ({ row }) => {
				const transaction = row.original;
				const actions = getActions(transaction);
				const canUseSimplePaidActions = isSimplePaidTransaction(transaction);
				const canUseOccurrenceActions =
					actions.canMarkAsPaid ||
					actions.canEditDueDate ||
					actions.canAdjustAmount ||
					actions.canSkip;
				const canUseViewContractAction = actions.canViewContract;
				const canUseReverseAction = actions.canReverse;
				const isReversed = isReversedTransaction(transaction);
				const menuActions = buildMovementMenuActions({
					transaction,
					actions: { ...actions, canReverse: canUseReverseAction },
					canUseSimplePaidActions,
					canUseOccurrenceActions,
					canUseViewContractAction,
					isReversed,
					isMarkingAsPaid,
					handlers: {
						onEdit: handleOpenEdit,
						onReverse: handleOpenReverse,
						onMarkAsPaid: handleMarkAsPaid,
						onEditDueDate: handleEditDueDate,
						onAdjustAmount: handleOpenAdjustAmount,
						onSkip: handleIgnoreThisMonth,
						onViewContract: handleViewContract,
						onDelete: handleOpenDelete,
					},
				}).filter(action => action.visible);

				return (
					<div className="text-right">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" className="h-8 w-8 p-0">
									<span className="sr-only">Abrir menu</span>
									<MoreVertical className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuLabel>Ações</DropdownMenuLabel>
								<DropdownMenuSeparator />
								{menuActions.map(action => {
									const Icon = action.icon;
									return (
										<DropdownMenuItem
											key={action.id}
											disabled={action.disabled}
											className={action.className}
											onClick={action.onClick}
										>
											<Icon className={`mr-2 h-4 w-4 ${action.className ?? ""}`} />
											{action.label}
										</DropdownMenuItem>
									);
								})}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			},
		},
	];

	return (
		<>
			<div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
				<PageBreadcrumbNav items={[{ label: "Transações" }, { label: "Movimentações", href: "/transacoes/movimentacoes" }]} />
				<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-end sm:mb-4">
					<MonthYearPicker date={currentDate} onChange={handleMonthYearChange} />
					<CreateTransactionDialog onCreated={loadTransactions} defaultDate={currentDate} />
				</div>
			</div>

			{/* {
				hasLoaded && !hasTransactions ? (
				<div className="min-h-[520px] flex flex-col items-center justify-center px-6 py-10">
					<div className="flex flex-col items-center text-center max-w-lg">
						<img
							src="/images/pigg.png"
							alt="Ilustração de um cofrinho"
							className="w-full max-w-[420px] sm:max-w-[520px] md:max-w-[600px] h-auto"
							loading="lazy"
						/>
						<h2 className="mt-6 text-lg font-semibold">
							Você ainda não tem movimentações cadastradas
						</h2>
						<p className="mt-2 text-sm text-muted-foreground">
							Que tal adicionar sua primeira transação?
						</p>
						<div className="mt-6">
							<CreateTransactionDialog
								onCreated={loadTransactions}
								defaultDate={currentDate}
								triggerLabel="Adicionar Primeira Transação"
								triggerSize="lg"
								triggerVariant="default"
							/>
						</div>
						<div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
							<Button variant="link" size="sm" onClick={handleImportTransactions} className="px-0">
								<Upload className="h-4 w-4" />
								Importar extrato bancário
							</Button>
							<Button variant="link" size="sm" className="px-0">
								<HelpCircle className="h-4 w-4" />
								Ver como funciona
							</Button>
						</div>
						{hasActiveFilters && (
							<div className="mt-4 text-sm text-muted-foreground">
								<p>Nenhuma movimentação encontrada para os filtros selecionados.</p>
								<Button variant="link" size="sm" onClick={handleClearFilters} className="px-0">
									Limpar filtros
								</Button>
							</div>
						)}
						<div className="mt-8">
							<MonthYearPicker date={currentDate} onChange={handleMonthYearChange} />
						</div>
					</div>
				</div>
			) : ( */}
				<>
					<div className="mt-3 space-y-8">
						<div className="space-y-3">
							<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
								<span className="font-semibold text-foreground">Período</span>
								<span>{periodLabel}</span>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
								<div className="rounded-xl border border-border/70 bg-background/80 p-6 shadow-sm">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3 text-base font-semibold text-foreground">
											<span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
												<TrendingUp className="h-6 w-6" />
											</span>
											<div className="flex flex-col">
												<span>Receitas</span>
												<span className={`text-xs font-medium ${badgeClassName(incomeMetric.badge, "income")}`}>
													{badgeAmountLabel(incomeMetric.badge)}
												</span>
												<span className="text-[11px] text-muted-foreground">
													{badgeReasonLabel(incomeMetric.badge.reason)}
												</span>
											</div>
										</div>
										<span className={`text-base font-semibold ${incomeDisplay.className}`}>
											{incomeDisplay.text}
										</span>
									</div>
								</div>
								<div className="rounded-xl border border-border/70 bg-background/80 p-6 shadow-sm">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3 text-base font-semibold text-foreground">
											<span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-600">
												<TrendingDown className="h-6 w-6" />
											</span>
											<div className="flex flex-col">
												<span>Despesas</span>
												<span className={`text-xs font-medium ${badgeClassName(expenseMetric.badge, "expense")}`}>
													{badgeAmountLabel(expenseMetric.badge)}
												</span>
												<span className="text-[11px] text-muted-foreground">
													{badgeReasonLabel(expenseMetric.badge.reason)}
												</span>
											</div>
										</div>
										<span className={`text-base font-semibold ${expenseDisplay.className}`}>
											{expenseDisplay.text}
										</span>
									</div>
								</div>
								{hasStatementItems && selectedCardWallet ? (
									<div className="rounded-xl border border-violet-500/30 bg-gradient-to-r from-[#121022] via-[#20143b] to-[#121022] p-6 shadow-sm">
										{isCardStatementLoading ? (
											<div className="h-16 animate-pulse rounded-md bg-violet-400/10" />
										) : (
											<div className="flex items-center justify-between gap-3">
												<div className="flex min-w-0 items-center gap-3">
													<div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/15 text-violet-200">
														<CreditCard className="h-6 w-6" />
													</div>
													<div className="min-w-0">
														<p className="truncate text-base font-semibold text-violet-50">{statementCardView.title}</p>
														<p className="truncate text-sm text-violet-100/90">{statementCardView.walletName}</p>
														<p className="truncate text-xs text-violet-100/80">
															{formatCurrency(statementCardView.amount)} <span className="mx-1 opacity-60">|</span> {statementCardView.dueLabel}
														</p>
													</div>
												</div>
												<Button
													type="button"
													className="h-9 shrink-0 rounded-md bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400"
													onClick={() => toast.info("Pagamento da fatura será integrado em breve.")}
												>
													Pagar
													<ChevronRight className="h-4 w-4" />
												</Button>
											</div>
										)}
									</div>
								) : (
									<div className="rounded-xl border border-violet-500/30 bg-gradient-to-r from-[#121022] via-[#20143b] to-[#121022] p-6 shadow-[0_0_24px_rgba(91,33,182,0.16)]">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3 text-base font-semibold text-violet-50">
												<span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/15 text-violet-200">
													<Wallet className="h-6 w-6" />
												</span>
												<div className="flex flex-col">
													<span>Saldo</span>
													<span className={`text-xs font-medium ${badgeClassName(balanceMetric.badge, "balance")}`}>
														{badgeAmountLabel(balanceMetric.badge)}
													</span>
													<span className="text-[11px] text-violet-100/70">
														{badgeReasonLabel(balanceMetric.badge.reason)}
													</span>
												</div>
											</div>
											<span className={`text-base font-semibold ${balanceDisplay.className}`}>
												{balanceDisplay.text}
											</span>
										</div>
									</div>
								)}
							</div>
						</div>

						<div className="space-y-3">
							<div className="flex flex-wrap items-center gap-3">
								<div className="flex items-center gap-2">
									<span className="tracking-wide text-md font-bold text-foreground">
										Resumo do mês
									</span>
								</div>
								<div className="ml-auto flex flex-wrap items-center gap-2">
									<MonthYearPicker date={currentDate} onChange={handleMonthYearChange} />
									<FilterSheet onApplyFilters={handleApplyFilters} activeFilters={activeFilters} />
								</div>
							</div>
							<DataTable
								variant="budget"
								columns={columns}
								data={filteredTransactions}
							/>
						</div>
					</div>
				</>
		 	{/* )
		 } */}

			<EditTransactionDialog
				open={isEditDialogOpen}
				onOpenChange={handleEditDialogChange}
				transaction={editingTransaction}
				onUpdated={loadTransactions}
			/>
			<DeleteTransactionDialog
				open={isDeleteDialogOpen}
				onOpenChange={handleDeleteDialogChange}
				transaction={deletingTransaction}
				onConfirm={handleConfirmDelete}
				loading={isDeleting}
			/>
			<ReverseTransactionDialog
				open={isReverseDialogOpen}
				onOpenChange={handleReverseDialogChange}
				transaction={reversingTransaction}
				onConfirm={handleConfirmReverse}
				loading={isReversing}
			/>
			<ContractInstallmentDetailsDrawer
				open={isContractInstallmentDrawerOpen}
				onOpenChange={handleContractInstallmentDrawerChange}
				transaction={contractTransaction}
			/>
			<ContractRecurringDetailsDrawer
				open={isContractRecurringDrawerOpen}
				onOpenChange={handleContractRecurringDrawerChange}
				transaction={recurringContractTransaction}
			/>
			<Dialog open={isAdjustAmountDialogOpen} onOpenChange={handleAdjustAmountDialogChange}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Ajustar valor</DialogTitle>
						<DialogDescription>
							Atualize o valor da ocorrência selecionada.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="adjust-amount-input">Novo valor</Label>
							<Input
								id="adjust-amount-input"
								inputMode="numeric"
								placeholder="0,00"
								value={adjustAmountInput}
								onChange={(e) => setAdjustAmountInput(maskCurrencyInput(e.target.value))}
							/>
						</div>
						{adjustingContractKind === "RECURRING" && (
							<div className="space-y-2">
								<Label>Como aplicar</Label>
								<div className="space-y-2">
									<label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer">
										<input
											type="radio"
											name="adjust-scope"
											value="single"
											checked={adjustScope === "single"}
											onChange={() => setAdjustScope("single")}
										/>
										<span>Apenas esta ocorrência</span>
									</label>
									<label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer">
										<input
											type="radio"
											name="adjust-scope"
											value="future"
											checked={adjustScope === "future"}
											onChange={() => setAdjustScope("future")}
										/>
										<span>Esta e futuras</span>
									</label>
								</div>
							</div>
						)}
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => handleAdjustAmountDialogChange(false)}>
							Cancelar
						</Button>
						<Button type="button" onClick={handleConfirmAdjustAmount} disabled={isAdjustingAmount}>
							{isAdjustingAmount ? "Salvando..." : "Salvar"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default TransactionsPage; 
