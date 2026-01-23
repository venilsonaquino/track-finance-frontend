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
import { Switch } from "@/components/ui/switch";
import { Calendar, Layers, PiggyBank, Timer, TrendingDown, TrendingUp, Info } from "lucide-react";
import { useWallets } from "../../hooks/use-wallets";
import { useCategories } from "../../hooks/use-categories";
import { IntervalType } from "@/types/Interval-type ";
import { DateUtils } from "@/utils/date-utils";
import { TransactionResponse } from "@/api/dtos/transaction/transactionResponse";
import { useTransactions } from "../../hooks/use-transactions";
import { TransactionRequest } from "@/api/dtos/transaction/transactionRequest";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { maskCurrencyInput, parseCurrencyInput } from "@/utils/currency-utils";

type TransactionType = "income" | "expense";

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
	transactionType: TransactionType;
	isRecurring: boolean;
	isInstallment: boolean;
	installmentNumber: string;
	installmentInterval: IntervalType;
	affectBalance: boolean;
};

const intervalOptions: { label: string; value: IntervalType }[] = [
	{ label: "Diário", value: "DAILY" },
	{ label: "Semanal", value: "WEEKLY" },
	{ label: "Mensal", value: "MONTHLY" },
	{ label: "Anual", value: "YEARLY" },
];

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
			transactionType: "expense",
			isRecurring: false,
			isInstallment: false,
			installmentNumber: "1",
			installmentInterval: "MONTHLY",
			affectBalance: true,
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
		transactionType: amountValue < 0 ? "expense" : "income",
	isRecurring: Boolean(transaction.isRecurring),
	isInstallment: Boolean(transaction.isInstallment),
	installmentNumber: transaction.installmentNumber ? transaction.installmentNumber.toString() : "1",
	installmentInterval: (transaction.installmentInterval as unknown as IntervalType) || "MONTHLY",
	affectBalance: transaction.affectBalance ?? true,
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

	const handleToggleRecurring = (checked: boolean) => {
		setFormData(prev => ({
			...prev,
			isRecurring: checked,
			isInstallment: checked ? false : prev.isInstallment,
		}));
	};

	const handleToggleInstallment = (checked: boolean) => {
		setFormData(prev => ({
			...prev,
			isInstallment: checked,
			isRecurring: checked ? false : prev.isRecurring,
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
		if (Number.isNaN(amountValue)) {
			toast.error("Informe um valor válido.");
			return;
		}

		const normalizedAmount = formData.transactionType === "expense" ? -Math.abs(amountValue) : Math.abs(amountValue);

		const payload: TransactionRequest = {
			id: transaction.id,
			depositedDate: formData.depositedDate,
			description: formData.description.trim(),
			walletId: formData.walletId,
			categoryId: formData.categoryId,
			amount: normalizedAmount,
			isInstallment: formData.isInstallment || null,
			installmentNumber: formData.isInstallment ? Number(formData.installmentNumber) || null : null,
			installmentInterval: formData.isInstallment ? formData.installmentInterval : null,
			isRecurring: formData.isRecurring || null,
			fitId: transaction.fitId ?? null,
			bankName: transaction.bankName ?? "Manual",
			bankId: transaction.bankId ?? "manual",
			accountId: transaction.accountId ?? formData.walletId,
			accountType: transaction.accountType ?? "MANUAL",
			currency: transaction.currency ?? "BRL",
			transactionDate: formData.depositedDate,
			transactionSource: transaction.transactionSource ?? "MANUAL",
			affectBalance: formData.affectBalance,
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
			<DialogContent className="sm:max-w-2xl">
				<form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[85vh]">
					<DialogHeader className="space-y-2">
						<DialogTitle>Editar transação</DialogTitle>
						<DialogDescription>Atualize os dados da movimentação selecionada.</DialogDescription>
					</DialogHeader>

					<div className="flex-1 overflow-y-auto py-6 space-y-6 pr-1">
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

						<div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr] gap-3">
							<div className="space-y-2">
								<Label htmlFor="amount">Valor</Label>
								<Input
									id="amount"
									type="text"
									inputMode="decimal"
									placeholder="0,00"
									value={formData.amount}
									onChange={(e) => handleChange("amount", maskCurrencyInput(e.target.value))}
								/>
							</div>
							<div className="space-y-2">
								<Label>Tipo</Label>
								<div className="grid grid-cols-2 gap-2">
									<Button
										type="button"
										variant={formData.transactionType === "income" ? "default" : "outline"}
										onClick={() => handleChange("transactionType", "income")}
										className="w-full"
									>
										<TrendingUp className="h-4 w-4 mr-2" />
										Entrada
									</Button>
									<Button
										type="button"
										variant={formData.transactionType === "expense" ? "default" : "outline"}
										onClick={() => handleChange("transactionType", "expense")}
										className="w-full"
									>
										<TrendingDown className="h-4 w-4 mr-2" />
										Saída
									</Button>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
								<Label>Carteira</Label>
								<Select
									value={formData.walletId || undefined}
									onValueChange={(value) => handleChange("walletId", value)}
									disabled={walletsLoading}
								>
									<SelectTrigger>
										<SelectValue placeholder="Selecione uma carteira" />
									</SelectTrigger>
									<SelectContent>
										{walletsLoading ? (
											<SelectItem value="loading" disabled>Carregando...</SelectItem>
										) : wallets.length === 0 ? (
											<SelectItem value="empty" disabled>Nenhuma carteira encontrada</SelectItem>
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

						<div className="space-y-1">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Label className="cursor-default">Afetar saldo da carteira?</Label>
									<Tooltip>
										<TooltipTrigger asChild>
											<button
												type="button"
												className="h-7 w-7 inline-flex items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground"
											>
												<Info className="h-4 w-4" />
											</button>
										</TooltipTrigger>
										<TooltipContent side="top">
											Se desativado, essa transação será registrada apenas para controle e não alterará seu saldo.
										</TooltipContent>
									</Tooltip>
								</div>
								<Switch
									checked={formData.affectBalance}
									onCheckedChange={(checked) => handleChange("affectBalance", checked)}
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

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div className="flex items-center justify-between rounded-lg border p-3">
								<div className="flex items-center gap-3">
									<PiggyBank className="h-4 w-4 text-muted-foreground" />
									<div className="space-y-0.5">
										<p className="text-sm font-medium">Transação fixa</p>
										<p className="text-xs text-muted-foreground">Repete todos os períodos</p>
									</div>
								</div>
								<Switch
									checked={formData.isRecurring}
									onCheckedChange={handleToggleRecurring}
								/>
							</div>

							<div className="flex items-center justify-between rounded-lg border p-3">
								<div className="flex items-center gap-3">
									<Layers className="h-4 w-4 text-muted-foreground" />
									<div className="space-y-0.5">
										<p className="text-sm font-medium">Parcelado</p>
										<p className="text-xs text-muted-foreground">Dividido em várias vezes</p>
									</div>
								</div>
								<Switch
									checked={formData.isInstallment}
									onCheckedChange={handleToggleInstallment}
								/>
							</div>
						</div>

						{formData.isInstallment && (
							<div className="grid grid-cols-1 sm:grid-cols-[1fr_1.2fr] gap-3">
								<div className="space-y-2">
									<Label htmlFor="installmentNumber">Número de parcelas</Label>
									<Input
										id="installmentNumber"
										type="number"
										min={1}
										value={formData.installmentNumber}
										onChange={(e) => handleChange("installmentNumber", e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>Intervalo</Label>
									<Select
										value={formData.installmentInterval || undefined}
										onValueChange={(value) => handleChange("installmentInterval", value as IntervalType)}
									>
										<SelectTrigger>
											<SelectValue placeholder="Selecione o intervalo" />
										</SelectTrigger>
										<SelectContent>
											{intervalOptions.map(option => (
												<SelectItem key={option.value} value={option.value || ""}>
													<div className="flex items-center gap-2">
														<Timer className="h-4 w-4 text-muted-foreground" />
														{option.label}
													</div>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						)}
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
