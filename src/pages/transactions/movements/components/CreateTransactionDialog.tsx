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
import { Calendar, ChevronRight, Layers, PiggyBank, Plus, Timer, TrendingDown, TrendingUp, Info } from "lucide-react";
import { useWallets } from "../../hooks/use-wallets";
import { useCategories } from "../../hooks/use-categories";
import { toast } from "sonner";
import { IntervalType } from "@/types/Interval-type ";
import { DateUtils } from "@/utils/date-utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatCurrency, maskCurrencyInput, parseCurrencyInput } from "@/utils/currency-utils";
import { createMovement } from "@/features/movements/services/movementService";
import { CreateMovementInput, MovementKind } from "@/features/movements/types";

type TransactionType = "income" | "expense";

type CreateTransactionDialogProps = {
	onCreated?: () => void | Promise<void>;
	defaultDate?: Date;
};

type InstallmentItem = {
	index: number;
	date: string;
	amount: number;
};

const addInterval = (date: Date, interval: IntervalType, step: number) => {
	const nextDate = new Date(date);
	switch (interval) {
		case "DAILY":
			nextDate.setDate(nextDate.getDate() + step);
			return nextDate;
		case "WEEKLY":
			nextDate.setDate(nextDate.getDate() + step * 7);
			return nextDate;
		case "YEARLY":
			nextDate.setFullYear(nextDate.getFullYear() + step);
			return nextDate;
		case "MONTHLY":
		default:
			nextDate.setMonth(nextDate.getMonth() + step);
			return nextDate;
	}
};

const buildInstallmentSchedule = (
	startDate: string,
	count: number,
	amount: number,
	interval: IntervalType
): InstallmentItem[] => {
	const baseDate = new Date(`${startDate}T00:00:00`);
	return Array.from({ length: count }, (_, index) => {
		const installmentDate = addInterval(baseDate, interval, index);
		return {
			index: index + 1,
			date: installmentDate.toLocaleDateString("pt-BR"),
			amount,
		};
	});
};

const InstallmentDetails = ({
	open,
	onOpenChange,
	items,
	totalAmount,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	items: InstallmentItem[];
	totalAmount: number;
}) => (
	<Popover open={open} onOpenChange={onOpenChange}>
		<PopoverTrigger asChild>
			<button
				type="button"
				title="Ver detalhes do parcelamento"
				aria-label="Ver detalhes do parcelamento"
				className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:text-foreground hover:border-border"
			>
				<ChevronRight className="h-4 w-4" />
			</button>
		</PopoverTrigger>
		<PopoverContent align="end" className="w-72 p-3">
			<div className="text-sm font-medium">Parcelamento</div>
			<div className="mt-2 max-h-48 space-y-1 overflow-auto text-xs text-muted-foreground">
				{items.map(item => (
					<div key={item.index} className="flex items-center justify-between">
						<span>{item.index}ª parcela • {item.date}</span>
						<span>{formatCurrency(item.amount)}</span>
					</div>
				))}
			</div>
			<div className="mt-2 flex items-center justify-between border-t pt-2 text-xs">
				<span className="text-muted-foreground">Total</span>
				<span className="font-medium">{formatCurrency(totalAmount)}</span>
			</div>
		</PopoverContent>
	</Popover>
);

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
	installmentNumber: "2",
	installmentInterval: "MONTHLY" as IntervalType,
	affectBalance: true,
});

export const CreateTransactionDialog = ({ onCreated, defaultDate }: CreateTransactionDialogProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isInstallmentDetailsOpen, setIsInstallmentDetailsOpen] = useState(false);
	const [formData, setFormData] = useState(() => buildInitialState(defaultDate));

	const { wallets, loading: walletsLoading } = useWallets();
	const { categories, loading: categoriesLoading } = useCategories();
	useEffect(() => {
		setFormData(prev => ({
			...prev,
			depositedDate: DateUtils.formatToISODate(defaultDate ?? new Date()),
		}));
	}, [defaultDate]);

	const isValid = useMemo(() => {
		const installmentsCount = Number(formData.installmentNumber);
		const hasValidInstallments = !formData.isInstallment || installmentsCount >= 2;

		return Boolean(
			formData.description.trim() &&
			formData.amount &&
			formData.depositedDate &&
			formData.walletId &&
			formData.categoryId &&
			hasValidInstallments
		);
	}, [formData]);

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
			installmentNumber: checked
				? Number(prev.installmentNumber) >= 2
					? prev.installmentNumber
					: "2"
				: prev.installmentNumber,
		}));
	};

	const installmentPreview = useMemo(() => {
		const totalAmount = parseCurrencyInput(formData.amount);
		const installmentsCount = Number(formData.installmentNumber);
		const canShow =
			formData.isInstallment &&
			!Number.isNaN(totalAmount) &&
			totalAmount > 0 &&
			installmentsCount >= 2;

		if (!canShow) {
			return {
				label: "—",
				items: [] as InstallmentItem[],
				totalAmount: 0,
				canShow: false,
			};
		}

		const perInstallment = Math.round((totalAmount / installmentsCount) * 100) / 100;
		return {
			label: formatCurrency(perInstallment),
			items: buildInstallmentSchedule(
				formData.depositedDate,
				installmentsCount,
				perInstallment,
				formData.installmentInterval ?? "MONTHLY"
			),
			totalAmount,
			canShow: true,
		};
	}, [
		formData.amount,
		formData.depositedDate,
		formData.installmentInterval,
		formData.installmentNumber,
		formData.isInstallment,
	]);

	useEffect(() => {
		if (!installmentPreview.canShow && isInstallmentDetailsOpen) {
			setIsInstallmentDetailsOpen(false);
		}
	}, [installmentPreview.canShow, isInstallmentDetailsOpen]);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!isValid) {
			toast.error("Preencha os campos obrigatórios para criar a transação.");
			return;
		}

		const amountValue = parseCurrencyInput(formData.amount);
		if (Number.isNaN(amountValue) || amountValue <= 0) {
			toast.error("Informe um valor válido.");
			return;
		}

		const installmentsCount = Number(formData.installmentNumber);
		if (formData.isInstallment && installmentsCount < 2) {
			toast.error("Informe pelo menos 2 parcelas.");
			return;
		}

		const absoluteAmount = Math.abs(amountValue);
		const normalizedAmount =
			formData.transactionType === "expense" ? -absoluteAmount : absoluteAmount;

		const kind: MovementKind = formData.isInstallment
			? "installment"
			: formData.isRecurring
				? "recurring"
				: "single";

		const amountForMovement = kind === "single" ? normalizedAmount : absoluteAmount;

		const movementInput: CreateMovementInput = {
			kind,
			depositedDate: formData.depositedDate,
			description: formData.description,
			walletId: formData.walletId,
			categoryId: formData.categoryId,
			amount: amountForMovement,
			affectBalance: formData.affectBalance,
			interval: formData.installmentInterval,
			installmentsCount: formData.isInstallment ? installmentsCount : null,
		};

		setIsSubmitting(true);

		try {
			await createMovement(movementInput);
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
								<Label htmlFor="amount">{formData.isInstallment ? "Valor total" : "Valor"}</Label>
								<div className={formData.isInstallment ? "flex flex-col sm:flex-row sm:items-center gap-2" : ""}>
									<Input
										id="amount"
										type="text"
										inputMode="decimal"
										placeholder="0,00"
										value={formData.amount}
										onChange={(e) => handleChange("amount", maskCurrencyInput(e.target.value))}
										className={formData.isInstallment ? "sm:flex-1" : ""}
									/>
									{formData.isInstallment && (
										<div className="flex items-center gap-2">
											<Select
												value={formData.installmentNumber}
												onValueChange={(value) => handleChange("installmentNumber", value)}
											>
												<SelectTrigger className="w-[96px]">
													<SelectValue placeholder="2" />
												</SelectTrigger>
												<SelectContent>
													{Array.from({ length: 23 }, (_, index) => index + 2).map(count => (
														<SelectItem key={count} value={String(count)}>
															{count}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<span className="text-sm text-muted-foreground">vezes</span>
											<span className="text-sm text-muted-foreground">de {installmentPreview.label}</span>
											{installmentPreview.canShow && (
												<InstallmentDetails
													open={isInstallmentDetailsOpen}
													onOpenChange={setIsInstallmentDetailsOpen}
													items={installmentPreview.items}
													totalAmount={installmentPreview.totalAmount}
												/>
											)}
										</div>
									)}
								</div>
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
