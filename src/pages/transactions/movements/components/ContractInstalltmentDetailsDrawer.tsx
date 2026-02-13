import { useEffect, useMemo, useState } from "react";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	AlertCircle,
	CheckCircle2,
	Clock3,
	Loader2,
	MoreHorizontal,
	Undo2,
} from "lucide-react";
import { TransactionResponse } from "@/api/dtos/transaction/transactionResponse";
import { InstallmentContractService } from "@/api/services/installmentContractService";
import { formatCurrency } from "@/utils/currency-utils";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

type OccurrenceItem = {
	id: string;
	date: string;
	amount: number;
	status: "PAID" | "FUTURE" | "OVERDUE" | "REVERSED";
};

type ContractViewData = {
	title: string;
	subtitle: string;
	installmentsCount: number;
	perAmount: number;
	totalAmount: number;
	installmentLabel: string;
	totalLabel: string;
	paidCount: number;
	futureCount: number;
	categoryName: string;
	createdAt: string;
	billingDayLabel: string;
	accountName: string;
	closingDay: number | null;
	dueDay: number | null;
	nextInvoiceLabel: string;
	paidAmount: number;
	remainingAmount: number;
	occurrences: OccurrenceItem[];
};

type ContractInstallmentDetailsDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	transaction: TransactionResponse | null;
};

const resolveContractId = (transaction: TransactionResponse): string | null => {
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
		(typeof asAny.installment_contract_id === "string" ? asAny.installment_contract_id : null) ??
		(typeof asAny.installmentContractId === "string" ? asAny.installmentContractId : null) ??
		null
	);
};

const toDateLabel = (value?: string) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "-";
	return parsed.toLocaleDateString("pt-BR");
};

const parseAmount = (value: unknown): number => {
	if (typeof value === "number") return Number.isFinite(value) ? value : 0;
	if (typeof value !== "string") return 0;
	const normalized = value.replace(/\./g, "").replace(",", ".").trim();
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : 0;
};

const buildMockData = (transaction: TransactionResponse): ContractViewData => {
	const amount = Math.abs(Number(transaction.amount) || 300);
	const installmentsCount = Math.max(12, transaction.installmentNumber ?? 12);
	const paidCount = 2;
	const futureCount = Math.max(0, installmentsCount - paidCount);
	const totalAmount = installmentsCount * amount;

	const today = new Date();
	const baseYear = today.getFullYear();
	const baseMonth = today.getMonth();
	const occurrences: OccurrenceItem[] = Array.from({ length: installmentsCount }, (_, index) => {
		const date = new Date(baseYear, baseMonth - paidCount + index + 1, 10);
		const status: OccurrenceItem["status"] = index < paidCount ? "PAID" : "FUTURE";
		return {
			id: String(index + 1),
			date: date.toISOString(),
			amount,
			status,
		};
	});

	return {
		title: transaction.description || "Contrato",
		subtitle: "Parcelamento no Cartão Nubank",
		installmentsCount,
		perAmount: amount,
		totalAmount,
		installmentLabel: `${installmentsCount}x de ${formatCurrency(amount)}`,
		totalLabel: formatCurrency(totalAmount),
		paidCount,
		futureCount,
		categoryName: transaction.category?.name || "Sem categoria",
		createdAt: transaction.depositedDate,
		billingDayLabel: "Todo dia 10",
		accountName: transaction.wallet?.name || "Nubank",
		closingDay: 20,
		dueDay: 28,
		nextInvoiceLabel: "Março/2026",
		paidAmount: paidCount * amount,
		remainingAmount: futureCount * amount,
		occurrences,
	};
};

const mapApiToView = (transaction: TransactionResponse, data: any): ContractViewData => {
	const header = data?.header ?? {};
	const info = data?.contractInfo ?? {};
	const account = info?.account ?? {};
	const installmentsRaw = Array.isArray(data?.installments) ? data.installments : [];
	const occurrencesRaw = installmentsRaw.length ? installmentsRaw : Array.isArray(data?.occurrences) ? data.occurrences : [];

	const parsedInstallmentAmount = parseAmount(
		installmentsRaw[0]?.amount ?? data.installmentAmount ?? data.amount ?? transaction.amount
	);
	const installmentsCount = Number(
		header?.progress?.total ??
		header?.total ??
		data.installmentsCount ??
		data.totalInstallments ??
		data.installment_count ??
		occurrencesRaw.length ??
		1
	);
	const paidCount = Number(header?.paidCount ?? data.paidCount ?? data.paid_count ?? 0);
	const futureCount = Number(
		header?.futureCount ??
		data.futureCount ??
		data.future_count ??
		Math.max(0, installmentsCount - paidCount)
	);
	const totalAmount = Math.abs(
		parseAmount(header?.totalLabel ?? data.totalAmount ?? data.total_amount) ||
		installmentsCount * parsedInstallmentAmount
	);

	const occurrences: OccurrenceItem[] = occurrencesRaw.map((item: any, index: number) => {
		const statusRaw = String(item.status ?? "").toUpperCase();
		const transactionStatusRaw = String(
			item.transactionStatus ??
			item.transaction_status ??
			item.transaction?.transactionStatus ??
			item.transaction?.transaction_status ??
			""
		).toUpperCase();
		const status: OccurrenceItem["status"] =
			statusRaw === "REVERSED" || transactionStatusRaw === "REVERSED"
				? "REVERSED"
				: statusRaw === "POSTED" || statusRaw === "PAID"
					? "PAID"
					: statusRaw === "OVERDUE"
						? "OVERDUE"
						: "FUTURE";
		return {
			id: String(item.id ?? index + 1),
			date: item.dueDate ?? item.due_date ?? transaction.depositedDate,
			amount: Math.abs(parseAmount(item.amount ?? parsedInstallmentAmount)),
			status,
		};
	});

	const perAmount = occurrences[0]?.amount ?? parsedInstallmentAmount;
	const paidAmount = occurrences
		.filter(item => item.status === "PAID")
		.reduce((acc, item) => acc + item.amount, 0);
	const remainingAmount = occurrences
		.filter(item => item.status !== "PAID")
		.reduce((acc, item) => acc + item.amount, 0);

	return {
		title: header?.title ?? data.description ?? transaction.description ?? "Contrato",
		subtitle: header?.subtitle ?? data.subtitle ?? "Parcelamento no Cartão Nubank",
		installmentsCount,
		perAmount,
		totalAmount,
		installmentLabel: header?.installmentLabel ?? `${installmentsCount}x de ${formatCurrency(perAmount)}`,
		totalLabel: header?.totalLabel ?? formatCurrency(totalAmount),
		paidCount,
		futureCount,
		categoryName: info?.categoryName ?? data.category?.name ?? transaction.category?.name ?? "Sem categoria",
		createdAt: data.createdAt ?? data.created_at ?? transaction.depositedDate,
		billingDayLabel: info?.billingDayLabel ?? "Todo dia 10",
		accountName: account?.walletName ?? data.wallet?.name ?? transaction.wallet?.name ?? "Nubank",
		closingDay: account?.closingDay ?? data.closingDay ?? data.closing_day ?? 20,
		dueDay: account?.dueDay ?? data.dueDay ?? data.due_day ?? 28,
		nextInvoiceLabel: account?.nextInvoice ?? data.nextInvoiceLabel ?? data.next_invoice_label ?? "Março/2026",
		paidAmount,
		remainingAmount,
		occurrences: occurrences.length ? occurrences : buildMockData(transaction).occurrences,
	};
};

export const ContractInstallmentDetailsDrawer = ({
	open,
	onOpenChange,
	transaction,
}: ContractInstallmentDetailsDrawerProps) => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<ContractViewData | null>(null);

	useEffect(() => {
		if (!open || !transaction) return;

		const contractId = resolveContractId(transaction);
		if (!contractId) {
			setData(buildMockData(transaction));
			setError("Contrato sem id válido. Exibindo dados mockados.");
			return;
		}

		let mounted = true;
		const load = async () => {
			setLoading(true);
			setError(null);
			try {
				const response = await InstallmentContractService.getInstallmentContractById(contractId);
				if (!mounted) return;
				setData(mapApiToView(transaction, response.data));
			} catch (err) {
				if (!mounted) return;
				console.error(err);
				setError("Não foi possível carregar o contrato. Exibindo dados mockados.");
				setData(buildMockData(transaction));
			} finally {
				if (mounted) setLoading(false);
			}
		};
		void load();

		return () => {
			mounted = false;
		};
	}, [open, transaction]);

	const progress = useMemo(() => {
		if (!data || data.installmentsCount <= 0) return 0;
		return Math.round((data.paidCount / data.installmentsCount) * 100);
	}, [data]);

	const closingDayLabel = data?.closingDay ? `Fecha dia ${data.closingDay}` : "Fechamento indisponível";
	const dueDayLabel = data?.dueDay ? `Vence dia ${data.dueDay}` : "Vencimento indisponível";
	const futureCount = data?.futureCount ?? 0;

	const handleCancelFutureInstallments = () => {
		if (!futureCount) {
			toast.info("Não há parcelas futuras para cancelar.");
			return;
		}
		const confirmed = window.confirm(
			`Você deseja cancelar as ${futureCount} parcelas futuras?\nAs já pagas não serão afetadas.`
		);
		if (!confirmed) return;
		toast.info("Cancelamento de parcelas futuras ainda não implementado.");
	};

	const handleChangeCategoryForFuture = () => {
		if (!futureCount) {
			toast.info("Não há parcelas futuras para alterar.");
			return;
		}
		toast.info("Alteração de categoria para parcelas futuras ainda não implementada.");
	};

	const handleChangeWalletForFuture = () => {
		if (!futureCount) {
			toast.info("Não há parcelas futuras para alterar.");
			return;
		}
		const confirmed = window.confirm(
			"Alterar carteira/cartão impacta as parcelas futuras. Deseja continuar?"
		);
		if (!confirmed) return;
		toast.info("Alteração de carteira/cartão ainda não implementada.");
	};

	const handleEndContract = () => {
		const confirmed = window.confirm(
			"Tem certeza que deseja encerrar este contrato?\nAs parcelas já pagas não serão alteradas."
		);
		if (!confirmed) return;
		toast.info("Encerramento de contrato ainda não implementado.");
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-[480px] sm:max-w-[560px] p-0">
				<SheetHeader className="px-5 py-4 border-b">
					<SheetTitle>Contrato</SheetTitle>
					<SheetDescription>Centro de controle do parcelamento</SheetDescription>
				</SheetHeader>

				{loading && (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-5 w-5 animate-spin mr-2" />
						<span className="text-sm text-muted-foreground">Carregando contrato...</span>
					</div>
				)}

				{!loading && data && (
					<>
						<ScrollArea className="h-[calc(100vh-160px)] px-5">
							<div className="py-5 space-y-5">
								<div className="space-y-2">
									<p className="text-lg font-semibold">{data.title}</p>
									<p className="text-sm text-muted-foreground">{data.subtitle}</p>
									<div className="pt-1">
										<p className="text-sm font-medium">
											{data.installmentLabel}
										</p>
										<p className="text-sm text-muted-foreground">
											Total: {data.totalLabel}
										</p>
									</div>
									<div className="flex items-center gap-2 text-xs">
										<Badge variant="secondary">{data.paidCount} pagas</Badge>
										<Badge variant="outline">{data.futureCount} futuras</Badge>
									</div>
									<div>
										<div className="h-2 w-full rounded-full bg-muted overflow-hidden">
											<div className="h-full bg-foreground/80" style={{ width: `${progress}%` }} />
										</div>
										<p className="mt-1 text-xs text-muted-foreground">
											{data.paidCount}/{data.installmentsCount}
										</p>
									</div>
								</div>

								<Separator />

								<div className="space-y-3">
									<p className="text-sm font-semibold">Informações do contrato</p>
									<div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
										<div>
											<p className="text-muted-foreground text-xs">Categoria</p>
											<p>{data.categoryName}</p>
										</div>
										<div>
											<p className="text-muted-foreground text-xs">Criado em</p>
											<p>{toDateLabel(data.createdAt)}</p>
										</div>
										<div>
											<p className="text-muted-foreground text-xs">Dia de cobrança</p>
											<p>{data.billingDayLabel}</p>
										</div>
										<div>
											<p className="text-muted-foreground text-xs">Próxima fatura</p>
											<p>{data.nextInvoiceLabel}</p>
										</div>
									</div>
									<div className="rounded-md border p-3 text-sm">
										<p className="text-muted-foreground text-xs">Conta / Cartão</p>
										<p>{data.accountName} • {closingDayLabel} • {dueDayLabel}</p>
									</div>
								</div>

								<Separator />

								<div className="space-y-3">
									<p className="text-sm font-semibold">Parcelas</p>
									<div className="space-y-2 max-h-100 overflow-y-auto pr-1">
										{data.occurrences
											.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
											.map(item => (
												<div
													key={item.id}
													className="flex items-center justify-between rounded-md border px-3 py-2"
												>
													<div className="flex items-center gap-2 text-sm">
														{item.status === "REVERSED" ? (
															<Undo2 className="h-4 w-4 text-amber-600" />
														) : item.status === "PAID" ? (
															<CheckCircle2 className="h-4 w-4 text-emerald-600" />
														) : item.status === "OVERDUE" ? (
															<AlertCircle className="h-4 w-4 text-red-500" />
														) : (
															<Clock3 className="h-4 w-4 text-muted-foreground" />
														)}
														<span
															className={
																item.status === "OVERDUE"
																	? "text-red-600"
																	: item.status === "REVERSED"
																		? "text-amber-700"
																		: ""
															}
														>
															{toDateLabel(item.date)} - {formatCurrency(item.amount)}
														</span>
														{item.status === "REVERSED" && (
															<Badge className="text-[10px] bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">
																Estornada
															</Badge>
														)}
													</div>
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button variant="ghost" size="icon" className="h-7 w-7">
																<MoreHorizontal className="h-4 w-4" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem>Editar vencimento</DropdownMenuItem>
															<DropdownMenuItem>Ajustar valor desta parcela</DropdownMenuItem>
															<DropdownMenuItem>Ignorar parcela</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											))}
									</div>
								</div>

								<Separator />

								<div className="space-y-2 text-sm">
									<p className="font-semibold">Resumo financeiro</p>
									<p>Já pago: {formatCurrency(data.paidAmount)}</p>
									<p>Restante: {formatCurrency(data.remainingAmount)}</p>
								</div>

								<Separator />

								<div className="space-y-3">
									<p className="text-sm font-semibold">Ações do contrato</p>
									<div className="rounded-lg border p-3 space-y-2">
										<Button
											type="button"
											variant="outline"
											className="w-full"
											onClick={handleCancelFutureInstallments}
										>
											Cancelar parcelas futuras
										</Button>
										<Button
											type="button"
											variant="outline"
											className="w-full"
											onClick={handleChangeCategoryForFuture}
										>
											Alterar categoria (aplica às futuras)
										</Button>
										<Button
											type="button"
											variant="outline"
											className="w-full"
											onClick={handleChangeWalletForFuture}
										>
											Alterar carteira/cartão
										</Button>
										<Button
											type="button"
											variant="destructive"
											className="w-full"
											onClick={handleEndContract}
										>
											Encerrar contrato
										</Button>
									</div>
								</div>

								{error && (
									<p className="text-xs text-amber-600">{error}</p>
								)}
							</div>
						</ScrollArea>
					</>
				)}
			</SheetContent>
		</Sheet>
	);
};
