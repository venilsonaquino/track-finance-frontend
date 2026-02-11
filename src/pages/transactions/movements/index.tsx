import PageBreadcrumbNav from "@/components/BreadcrumbNav";
import { getAmountDisplay } from "@/utils/transaction-utils";
import { useTransactions } from "../hooks/use-transactions";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TransactionsRecordResponse from "@/api/dtos/transaction/transactionRecordResponse";
import { Button } from "@/components/ui/button";
import { HelpCircle, MoreVertical, TrendingDown, TrendingUp, Upload, Wallet } from "lucide-react";
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

const TransactionsPage = () => {
	const navigate = useNavigate();
	const { getTransactions, deleteTransaction } = useTransactions();
	const [transactionsData, setTransactionsData] = useState<TransactionsRecordResponse | null>(null);
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

	const loadTransactions = useCallback(async () => {
		try {
			let startDate: string;
			let endDate: string;
			let categoryIds: string[] = [];

			if (activeFilters) {
				startDate = activeFilters.startDate;
				endDate = activeFilters.endDate;
				categoryIds = activeFilters.categoryIds;
			} else {
				const monthDates = DateUtils.getMonthStartAndEnd(currentDate);
				startDate = monthDates.startDate;
				endDate = monthDates.endDate;
			}

			const response = await getTransactions(startDate, endDate, categoryIds);
			setTransactionsData(response);
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
		if (activeFilters?.timeline && activeFilters.timeline !== "todas") {
			const today = DateUtils.formatToISODate(new Date());
			if (activeFilters.timeline === "realizadas") {
				filtered = filtered.filter(transaction => {
					const depositedDate = DateUtils.formatToISODate(new Date(transaction.depositedDate));
					return depositedDate <= today;
				});
			} else {
				filtered = filtered.filter(transaction => {
					const depositedDate = DateUtils.formatToISODate(new Date(transaction.depositedDate));
					return depositedDate > today;
				});
			}
		}
		return filtered;
	}, [activeFilters, allTransactions]);
	const summaryTotals = useMemo(() => {
		let income = 0;
		let expense = 0;
		filteredTransactions.forEach(transaction => {
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
	}, [filteredTransactions]);
	const incomeDisplay = getAmountDisplay(summaryTotals.income, "INCOME");
	const expenseDisplay = getAmountDisplay(summaryTotals.expense, "EXPENSE");
	const balanceDisplay = getAmountDisplay(summaryTotals.balance);
	const hasLoaded = transactionsData !== null;
	const hasTransactions = filteredTransactions.length > 0;
	const hasActiveFilters = Boolean(activeFilters);

	const handleClearFilters = () => {
		setActiveFilters(null);
	};

	const handleImportTransactions = () => {
		navigate("/transacoes/importar");
	};

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
			<div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
				<PageBreadcrumbNav items={[{ label: "Transações" }, { label: "Movimentações", href: "/transacoes/movimentacoes" }]} />
				<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-end sm:mb-4">
					<MonthYearPicker date={currentDate} onChange={handleMonthYearChange} />
					<CreateTransactionDialog onCreated={loadTransactions} defaultDate={currentDate} />
				</div>
			</div>

			{hasLoaded && !hasTransactions ? (
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
			) : (
				<>
					<div className="mb-5 rounded-2xl py-5">
						<div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
							<div className="rounded-xl border bg-background/70 p-6 shadow-sm">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3 text-base font-semibold text-foreground">
										<span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
											<TrendingUp className="h-7 w-7" />
										</span>
										Receitas
									</div>
									<span className={`text-base font-semibold ${incomeDisplay.className}`}>
										{incomeDisplay.text}
									</span>
								</div>
							</div>
							<div className="rounded-xl border bg-background/70 p-6 shadow-sm">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3 text-base font-semibold text-foreground">
										<span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-600">
											<TrendingDown className="h-7 w-7" />
										</span>
										Despesas
									</div>
									<span className={`text-base font-semibold ${expenseDisplay.className}`}>
										{expenseDisplay.text}
									</span>
								</div>
							</div>
							<div className="rounded-xl border bg-background/70 p-6 shadow-sm">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3 text-base font-semibold text-foreground">
										<span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
											<Wallet className="h-7 w-7" />
										</span>
										Saldo
									</div>
									<span className={`text-base font-semibold ${balanceDisplay.className}`}>
										{balanceDisplay.text}
									</span>
								</div>
							</div>
						</div>
					</div>
					<DataTable
						headerTitle="Resumo do mês"
						headerPeriod={<MonthYearPicker date={currentDate} onChange={handleMonthYearChange} />}
						headerSheet={<FilterSheet onApplyFilters={handleApplyFilters} activeFilters={activeFilters} />}
						columns={columns}
						data={filteredTransactions}
					/>
				</>
			)}

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
