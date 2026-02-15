import { useEffect, useMemo, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { useWallets } from "../../hooks/use-wallets";
import { useCategories } from "../../hooks/use-categories";
import { DateUtils } from "@/utils/date-utils";
import { TransactionResponse } from "@/api/dtos/transaction/transactionResponse";
import { useTransactions } from "../../hooks/use-transactions";
import { TransactionRequest } from "@/api/dtos/transaction/transactionRequest";
import { toast } from "sonner";
import { maskCurrencyInput, parseCurrencyInput } from "@/utils/currency-utils";

type EditTransactionDialogProps = {
	transaction: TransactionResponse | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpdated?: () => void | Promise<void>;
};

type FormState = {
	description: string;
	amount: string;
	depositedDate: string;
	walletId: string;
	categoryId: string;
};

const parseDepositedDate = (date?: string) => {
	if (!date) return DateUtils.formatToISODate(new Date());
	return date.includes("T") ? date.split("T")[0] : date;
};

const buildInitialState = (transaction: TransactionResponse | null): FormState => {
	if (!transaction) {
		return {
			description: "",
			amount: "",
			depositedDate: DateUtils.formatToISODate(new Date()),
			walletId: "",
			categoryId: "",
		};
	}

	const amountValue = Number(transaction.amount);
	const amountCents = Number.isNaN(amountValue) ? 0 : Math.round(Math.abs(amountValue) * 100);

	return {
		description: transaction.description || "",
		amount: Number.isNaN(amountValue) ? "" : maskCurrencyInput(amountCents.toString()),
		depositedDate: parseDepositedDate(transaction.depositedDate),
		walletId: transaction.wallet?.id || "",
		categoryId: transaction.category?.id || "",
	};
};

export const EditTransactionDialog = ({
	transaction,
	open,
	onOpenChange,
	onUpdated,
}: EditTransactionDialogProps) => {
	const [formData, setFormData] = useState<FormState>(() => buildInitialState(transaction));
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { wallets, loading: walletsLoading } = useWallets();
	const { categories, loading: categoriesLoading } = useCategories();
	const { updateTransaction } = useTransactions();

	useEffect(() => {
		if (transaction && open) {
			setFormData(buildInitialState(transaction));
		}
	}, [transaction, open]);

	const isValid = useMemo(() => {
		return Boolean(
			formData.description.trim() &&
			formData.amount &&
			formData.depositedDate &&
			formData.walletId &&
			formData.categoryId &&
			transaction?.id
		);
	}, [formData, transaction?.id]);

	const handleChange = <T extends unknown>(field: string, value: T) => {
		setFormData(prev => ({
			...prev,
			[field]: value,
		}));
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!transaction?.id) {
			toast.error("Transação inválida para edição.");
			return;
		}

		if (!isValid) {
			toast.error("Preencha os campos obrigatórios para salvar as alterações.");
			return;
		}

		const amountValue = parseCurrencyInput(formData.amount);
		if (Number.isNaN(amountValue) || amountValue <= 0) {
			toast.error("Informe um valor válido.");
			return;
		}

		const originalType = transaction.transactionType === "INCOME" ? "INCOME" : "EXPENSE";
		const normalizedAmount = originalType === "EXPENSE" ? -Math.abs(amountValue) : Math.abs(amountValue);

		const payload: TransactionRequest = {
			id: transaction.id,
			depositedDate: formData.depositedDate,
			description: formData.description.trim(),
			walletId: formData.walletId,
			categoryId: formData.categoryId,
			amount: normalizedAmount,
			transactionType: originalType,
			affectBalance: transaction.affectBalance ?? true,
		};

		setIsSubmitting(true);

		try {
			await updateTransaction(payload);
			toast.success("Transação atualizada com sucesso.");
			onOpenChange(false);
			await onUpdated?.();
		} catch (error) {
			console.error(error);
			toast.error("Não foi possível atualizar a transação.");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!transaction) {
		return null;
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl">
				<form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[85vh]">
					<DialogHeader className="space-y-2">
						<DialogTitle>Editar transação</DialogTitle>
						<DialogDescription>Atualize os dados da movimentação selecionada.</DialogDescription>
					</DialogHeader>

					<div className="flex-1 overflow-y-auto py-6 space-y-4 pr-1">
						<div className="space-y-2">
							<Label htmlFor="description">Descrição</Label>
							<Input
								id="description"
								placeholder="Ex.: Almoço, salário, transferência..."
								value={formData.description}
								maxLength={255}
								onChange={(e) => handleChange("description", e.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="amount">Valor</Label>
							<Input
								id="amount"
								type="text"
								inputMode="decimal"
								placeholder="0,00"
								value={formData.amount}
								onChange={(e) => handleChange("amount", maskCurrencyInput(e.target.value))}
								disabled
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="date">Data</Label>
							<div className="relative">
								<Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									id="date"
									type="date"
									value={formData.depositedDate}
									onChange={(e) => handleChange("depositedDate", e.target.value)}
									className="pl-9"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label>Categoria</Label>
							<Select
								value={formData.categoryId || undefined}
								onValueChange={(value) => handleChange("categoryId", value)}
								disabled={categoriesLoading}
							>
								<SelectTrigger>
									<SelectValue placeholder="Selecione uma categoria" />
								</SelectTrigger>
								<SelectContent>
									{categoriesLoading ? (
										<SelectItem value="loading" disabled>Carregando...</SelectItem>
									) : categories.length === 0 ? (
										<SelectItem value="empty" disabled>Nenhuma categoria encontrada</SelectItem>
									) : (
										categories.map(category => (
											<SelectItem key={category.id} value={category.id}>
												<div className="flex items-center gap-2">
													<span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: category.color }} />
													{category.name}
												</div>
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Conta</Label>
							<Select
								value={formData.walletId || undefined}
								onValueChange={(value) => handleChange("walletId", value)}
								disabled={walletsLoading}
							>
								<SelectTrigger>
									<SelectValue placeholder="Selecione uma conta" />
								</SelectTrigger>
								<SelectContent>
									{walletsLoading ? (
										<SelectItem value="loading" disabled>Carregando...</SelectItem>
									) : wallets.length === 0 ? (
										<SelectItem value="empty" disabled>Nenhuma conta encontrada</SelectItem>
									) : (
										wallets.map(wallet => (
											<SelectItem key={wallet.id} value={wallet.id!}>
												{wallet.name}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
						</div>
					</div>

					<DialogFooter className="gap-3 border-t pt-4">
						<Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
							Cancelar
						</Button>
						<Button type="submit" disabled={!isValid || isSubmitting}>
							{isSubmitting ? "Salvando..." : "Salvar alterações"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};
