import PageBreadcrumbNav from "@/components/BreadcrumbNav";
import { formatCurrency } from "@/utils/currency-utils";
import { useTransactions } from "../hooks/use-transactions";
import { useCallback, useEffect, useState } from "react";
import TransactionsRecordResponse from "@/api/dtos/transaction/transactionRecordResponse";
import { Button } from "@/components/ui/button";
import { MoreVertical, Wallet } from "lucide-react";
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
	// const navigate = useNavigate();
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
	}) => {
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
				const isNegative = amount < 0;
				
				return (
					<div className="text-right">
						<span className={isNegative ? "text-red-500" : "text-green-500"}>
							{formatCurrency(amount)}
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
			<div className="flex justify-between items-center">
				<PageBreadcrumbNav items={[{ label: "Transações" }, { label: "Movimentações", href: "/transacoes/movimentacoes" }]} />
				<div className="flex justify-end gap-2 mb-4">
					<CreateTransactionDialog onCreated={loadTransactions} defaultDate={currentDate} />
					<FilterSheet onApplyFilters={handleApplyFilters} />
				</div>
			</div>

			<DataTable 
				columns={columns} 
				data={allTransactions} 
				toolbar={
					<div className="flex items-center gap-2">
						<MonthYearPicker date={currentDate} onChange={handleMonthYearChange} />
					</div>
				}
			/>

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
