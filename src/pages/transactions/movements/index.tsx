import PageBreadcrumbNav from "@/components/BreadcrumbNav";
import { getAmountDisplay } from "@/utils/transaction-utils";
import { useTransactions } from "../hooks/use-transactions";
import { useCallback, useEffect, useMemo, useState } from "react";
import TransactionsRecordResponse from "@/api/dtos/transaction/transactionRecordResponse";
import { Button } from "@/components/ui/button";
import { MoreVertical, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { TransactionResponse } from "@/api/dtos/transaction/transactionResponse";
import { Edit, Trash2 } from "lucide-react";
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
import { toast } from "sonner";
import { formatCurrency } from "@/utils/currency-utils";

const TransactionsPage = () => {
	const { getTransactions, deleteTransaction } = useTransactions();
	const [transactionsData, setTransactionsData] = useState<TransactionsRecordResponse | null>(null);
	const [previousTransactionsData, setPreviousTransactionsData] = useState<TransactionsRecordResponse | null>(null);
	const [currentDate, setCurrentDate] = useState(new Date());
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editingTransaction, setEditingTransaction] = useState<TransactionResponse | null>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [deletingTransaction, setDeletingTransaction] = useState<TransactionResponse | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [activeFilters, setActiveFilters] = useState<{
		startDate: string;
		endDate: string;
		categoryIds: string[];
		timeline: "realizadas" | "futuras" | "todas";
		periodPreset: "month" | "last30" | "custom";
		walletId: string | null;
	} | null>(null);

	const normalizeTransactionsResponse = (data: unknown): TransactionsRecordResponse => {
		const emptySummary = {
			current_balance: 0,
			monthly_income: 0,
			monthly_expense: 0,
			monthly_balance: 0,
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
			const asAny = data as Partial<TransactionsRecordResponse> & {
				transactions?: TransactionResponse[];
				items?: TransactionResponse[];
				data?: TransactionResponse[];
			};

			if (Array.isArray(asAny.records)) {
				return {
					records: asAny.records,
					summary: asAny.summary ?? emptySummary,
				};
			}

			const list = asAny.transactions ?? asAny.items ?? asAny.data;
			if (Array.isArray(list)) {
				return {
					records: [
						{
							date: "",
							endOfDayBalance: null,
							transactions: list,
						},
					],
					summary: emptySummary,
				};
			}
		}

		return { records: [], summary: emptySummary };
	};

	const getMonthLabel = (date: Date) => {
		const months = [
			"janeiro",
			"fevereiro",
			"março",
			"abril",
			"maio",
			"junho",
			"julho",
			"agosto",
			"setembro",
			"outubro",
			"novembro",
			"dezembro",
		];
		return months[date.getMonth()];
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

			const previousMonthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
			const previousRange = DateUtils.getMonthStartAndEnd(previousMonthDate);

			const [currentResponse, previousResponse] = await Promise.all([
				getTransactions(startDate, endDate, view),
				getTransactions(previousRange.startDate, previousRange.endDate, view),
			]);

			setTransactionsData(normalizeTransactionsResponse(currentResponse));
			setPreviousTransactionsData(normalizeTransactionsResponse(previousResponse));
		} catch (error) {
			console.error("Erro ao carregar transações:", error);
		}
	}, [activeFilters, currentDate, getTransactions]);

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

	const allTransactions = transactionsData?.records?.flatMap(record => record.transactions) || [];
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

	const previousTransactions = previousTransactionsData?.records?.flatMap(record => record.transactions) || [];
	const filteredPreviousTransactions = useMemo(() => {
		let filtered = previousTransactions;
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
	}, [activeFilters, previousTransactions]);

	const buildTotals = (transactions: TransactionResponse[]) => {
		let income = 0;
		let expense = 0;
		transactions.forEach(transaction => {
			const amount = Number(transaction.amount);
			if (!Number.isFinite(amount)) return;
			if (transaction.transactionType === "INCOME") {
				income += amount;
				return;
			}
			if (transaction.transactionType === "EXPENSE") {
				expense += Math.abs(amount);
				return;
			}
			if (amount >= 0) {
				income += amount;
				return;
			}
			expense += Math.abs(amount);
		});
		return {
			income,
			expense,
			balance: income - expense,
		};
	};
	const summaryTotals = useMemo(() => {
		return buildTotals(filteredTransactions);
	}, [filteredTransactions]);
	const previousTotals = useMemo(() => buildTotals(filteredPreviousTransactions), [filteredPreviousTransactions]);
	const incomeDisplay = getAmountDisplay(summaryTotals.income, "INCOME");
	const expenseDisplay = getAmountDisplay(summaryTotals.expense, "EXPENSE");
	const balanceDisplay = getAmountDisplay(summaryTotals.balance);

	const periodLabel = getPeriodLabel(currentDate);
	const previousMonthLabel = getMonthLabel(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

	const getDeltaBadge = (current: number, previous: number, kind: "income" | "expense" | "balance") => {
		if (!Number.isFinite(previous) || previous === 0) {
			return {
				amountText: "▲ +R$ 0",
				helperText: `(sem base em ${previousMonthLabel})`,
				className: "text-muted-foreground",
				icon: "",
			};
		}

		const diff = current - previous;
		const positive = diff >= 0;
		const sign = diff >= 0 ? "+" : "-";
		const icon = diff >= 0 ? "▲" : "▼";

		const className = (() => {
			if (!diff) return "text-muted-foreground";
			if (kind === "expense") {
				return positive ? "text-red-500" : "text-emerald-500";
			}
			return positive ? "text-emerald-500" : "text-red-500";
		})();

		if (diff === 0) {
			return {
				amountText: "▲ +R$ 0",
				helperText: `(igual a ${previousMonthLabel})`,
				className: "text-muted-foreground",
				icon,
			};
		}

		const multiplierRaw = Math.abs(diff) / Math.abs(previous);
		const multiplier = Number.isFinite(multiplierRaw)
			? Number(multiplierRaw.toFixed(1)).toString().replace(/\.0$/, "")
			: null;
		const percentRaw = (diff / previous) * 100;
		const percent = Number.isFinite(percentRaw) ? Math.round(percentRaw) : null;
		const relation =
			kind === "balance" && percent !== null
				? `(${Math.abs(percent)}% ${positive ? "maior" : "menor"} que ${previousMonthLabel})`
				: multiplier
					? `(${multiplier}x ${positive ? "maior" : "menor"} que ${previousMonthLabel})`
					: `(vs ${previousMonthLabel})`;

		return {
			amountText: `${icon} ${sign}${formatCurrency(Math.abs(diff))}`,
			helperText: relation,
			className,
			icon,
		};
	};

	const incomeDelta = getDeltaBadge(summaryTotals.income, previousTotals.income, "income");
	const expenseDelta = getDeltaBadge(summaryTotals.expense, previousTotals.expense, "expense");
	const balanceDelta = getDeltaBadge(summaryTotals.balance, previousTotals.balance, "balance");

	const columns: ColumnDef<TransactionResponse>[] = [
		{
			accessorKey: "depositedDate",
			header: () => <div className="text-left">Data</div>,
			size: 100,
			cell: ({ row }) => {
				const date = new Date(row.getValue("depositedDate")).toLocaleDateString("pt-BR");
				return <div className="text-left">{date}</div>;
			},
		},
		{
			accessorKey: "description",
			header: () => <div className="text-center">Descrição</div>,
			size: 300,
			cell: ({ row }) => {
				const description = row.getValue("description") as string;
				
				return (
					<div className="text-center">
						<span
							title={description}
							className="block truncate"
						>
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

				return (
					<div
						className="flex items-center"
						style={{ minHeight: 40 }}
					>
						<div className="flex-shrink-0 w-10 flex justify-center items-center">
							<div
								className="w-10 h-10 rounded-full flex items-center justify-center text-white"
								style={{ backgroundColor: category.color }}
							>
								<DynamicIcon
									name={category.icon as any}
									size={22}
									className="text-white"
								/>
							</div>
						</div>
						<span className="ml-2 text-sm truncate">{category.name}</span>
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
				
				return (
					<div className="text-center">
						<div className="flex items-center justify-center">
							<BankLogo 
								bankId={wallet.bankId} 
								size="md" 
								fallbackIcon={<Wallet className="w-7 h-4" />}
								className="mr-2 flex-shrink-0"
							/>
							<span className="truncate">{wallet.name}</span>
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
				const amount = Number(row.getValue("amount"));
				const transaction = row.original as { transactionType?: "INCOME" | "EXPENSE" | "TRANSFER" };
				const { text: amountText, className: amountClass } = getAmountDisplay(
					amount,
					transaction.transactionType
				);
				
				return (
					<div className="text-right">
						<span className={amountClass}>
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
								<DropdownMenuItem onClick={() => handleOpenEdit(transaction)}>
									<Edit className="mr-2 h-4 w-4 " />
									Editar
								</DropdownMenuItem>
								<DropdownMenuItem className="text-red-600" onClick={() => handleOpenDelete(transaction)}>
									<Trash2 className="text-red-600 mr-2 h-4 w-4" />
									Excluir
								</DropdownMenuItem>
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
												<span className={`text-xs font-medium ${incomeDelta.className}`}>
													{incomeDelta.amountText}
												</span>
												<span className="text-[11px] text-muted-foreground">
													{incomeDelta.helperText}
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
												<span className={`text-xs font-medium ${expenseDelta.className}`}>
													{expenseDelta.amountText}
												</span>
												<span className="text-[11px] text-muted-foreground">
													{expenseDelta.helperText}
												</span>
											</div>
										</div>
										<span className={`text-base font-semibold ${expenseDisplay.className}`}>
											{expenseDisplay.text}
										</span>
									</div>
								</div>
								<div className="rounded-xl border border-border/70 bg-background/80 p-6 shadow-sm">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3 text-base font-semibold text-foreground">
											<span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
												<Wallet className="h-6 w-6" />
											</span>
											<div className="flex flex-col">
												<span>Saldo</span>
												<span className={`text-xs font-medium ${balanceDelta.className}`}>
													{balanceDelta.amountText}
												</span>
												<span className="text-[11px] text-muted-foreground">
													{balanceDelta.helperText}
												</span>
											</div>
										</div>
										<span className={`text-base font-semibold ${balanceDisplay.className}`}>
											{balanceDisplay.text}
										</span>
									</div>
								</div>
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
		</>
	);
};

export default TransactionsPage; 
