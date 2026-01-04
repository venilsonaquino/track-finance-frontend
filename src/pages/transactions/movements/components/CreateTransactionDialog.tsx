import { useEffect, useMemo, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
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
import { Calendar, Layers, PiggyBank, Plus, Timer, TrendingDown, TrendingUp, Info } from "lucide-react";
import { useWallets } from "../../hooks/use-wallets";
import { useCategories } from "../../hooks/use-categories";
import { useTransactions } from "../../hooks/use-transactions";
import { toast } from "sonner";
import { TransactionRequest } from "@/api/dtos/transaction/transactionRequest";
import { maskCurrencyInput, parseCurrencyInput } from "@/utils/currency-utils";
import { IntervalType } from "@/types/Interval-type ";
import { DateUtils } from "@/utils/date-utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type TransactionType = "income" | "expense";

type CreateTransactionDialogProps = {
	onCreated?: () => void | Promise<void>;
	defaultDate?: Date;
};

const intervalOptions: { label: string; value: IntervalType }[] = [
	{ label: "Diário", value: "DAILY" },
	{ label: "Semanal", value: "WEEKLY" },
	{ label: "Mensal", value: "MONTHLY" },
	{ label: "Anual", value: "YEARLY" },
];

const buildInitialState = (date?: Date) => ({
	description: "",
	amount: "",
	depositedDate: DateUtils.formatToISODate(date ?? new Date()),
	walletId: "",
	categoryId: "",
	transactionType: "expense" as TransactionType,
	isRecurring: false,
	isInstallment: false,
	installmentNumber: "1",
	installmentInterval: "MONTHLY" as IntervalType,
	affectBalance: true,
});

export const CreateTransactionDialog = ({ onCreated, defaultDate }: CreateTransactionDialogProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState(() => buildInitialState(defaultDate));

	const { wallets, loading: walletsLoading } = useWallets();
	const { categories, loading: categoriesLoading } = useCategories();
	const { createTransaction } = useTransactions();

	useEffect(() => {
		setFormData(prev => ({
			...prev,
			depositedDate: DateUtils.formatToISODate(defaultDate ?? new Date()),
		}));
	}, [defaultDate]);

	const isValid = useMemo(() => {
		return Boolean(
			formData.description.trim() &&
			formData.amount &&
			formData.depositedDate &&
			formData.walletId &&
			formData.categoryId
		);
	}, [formData]);

	const handleChange = <T extends unknown>(field: string, value: T) => {
		setFormData(prev => ({
			...prev,
			[field]: value,
		}));
	};

	const handleAmountChange = (value: string) => {
		handleChange("amount", maskCurrencyInput(value));
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

		if (!isValid) {
			toast.error("Preencha os campos obrigatórios para criar a transação.");
			return;
		}

		const amountValue = parseCurrencyInput(formData.amount);
		if (!Number.isFinite(amountValue)) {
			toast.error("Informe um valor válido.");
			return;
		}

		// const normalizedAmount = formData.transactionType === "expense" ? -Math.abs(amountValue) : Math.abs(amountValue);

		// const payload: TransactionRequest = {
		// 	depositedDate: formData.depositedDate,
		// 	description: formData.description.trim(),
		// 	walletId: formData.walletId,
		// 	categoryId: formData.categoryId,
		// 	amount: normalizedAmount,
		// 	isInstallment: formData.isInstallment || null,
		// 	installmentNumber: formData.isInstallment ? Number(formData.installmentNumber) || null : null,
		// 	installmentInterval: formData.isInstallment ? formData.installmentInterval : null,
		// 	isRecurring: formData.isRecurring || null,
		// 	fitId: null,
		// 	bankName: "Manual",
		// 	bankId: "manual",
		// 	accountId: formData.walletId,
		// 	accountType: "MANUAL",
		// 	currency: "BRL",
		// 	transactionDate: formData.depositedDate,
		// 	transactionSource: "MANUAL",
		// 	affectBalance: formData.affectBalance,
		// };

		setIsSubmitting(true);

		try {
			// await createTransaction(payload);
			toast.success("Transação criada com sucesso.");
			setIsOpen(false);
			setFormData(buildInitialState(defaultDate));
			await onCreated?.();
		} catch (error) {
			console.error(error);
			toast.error("Não foi possível criar a transação.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button>
					<Plus className="h-4 w-4 mr-2" />
					Nova Transação
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl">
				<form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[85vh]">
					<DialogHeader className="space-y-2">
						<DialogTitle>Nova transação</DialogTitle>
						<DialogDescription>
							Informe os dados da transação para registrar manualmente uma movimentação.
						</DialogDescription>
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
									onChange={(e) => handleAmountChange(e.target.value)}
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
						<Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
							Cancelar
						</Button>
						<Button type="submit" disabled={!isValid || isSubmitting}>
							{isSubmitting ? "Salvando..." : "Salvar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};
