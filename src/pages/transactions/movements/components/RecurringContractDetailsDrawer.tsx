import { useEffect, useMemo, useState } from "react";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock3, Loader2, RotateCw } from "lucide-react";
import { TransactionResponse } from "@/api/dtos/transaction/transactionResponse";
import { RecurringContractService } from "@/api/services/recurringContractService";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/currency-utils";

type RecurringContractDetailsDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	transaction: TransactionResponse | null;
};

type Occurrence = {
	id: string;
	date: string;
	amountLabel: string;
	status: "PAID" | "FUTURE";
};

type RecurringContractDetailsResponse = {
	contractId: string;
	contract: {
		title: string;
		type: "FIXED";
		recurrenceType: "RECURRING";
		interval: string;
		amount: string;
		status: string;
		nextChargeDate: string;
	};
	recurringInfo: {
		value: string;
		periodicity: string;
		billingDay: number;
		account: { id: string; name: string } | null;
		category: { id: string; name: string } | null;
		createdAt: string | null;
	};
	occurrenceHistory: {
		items: Array<{
			id: string | null;
			dueDate: string;
			amount: string;
			status: "PAID" | "FUTURE";
			transactionId: string | null;
		}>;
		paidLimit: number;
		futureLimit: number;
		hasMoreHistory: boolean;
	};
	financialSummary: {
		totalPaid: string;
		activeMonths: number;
	};
};

type RecurringContractViewModel = {
	header: {
		title: string;
		subtitle: string;
		amountPerMonthLabel: string;
		statusLabel: string;
		nextChargeDateLabel: string;
	};
	info: {
		valueLabel: string;
		periodicityLabel: string;
		billingDayLabel: string;
		accountName: string;
		categoryName: string;
		createdAtLabel: string;
	};
	occurrences: Occurrence[];
	limitsText: string;
	hasMoreHistory: boolean;
	summary: {
		totalPaidLabel: string;
		activeMonthsLabel: string;
	};
};

const toDateLabel = (value?: string) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString("pt-BR");
};

const parseAmount = (value: unknown): number => {
	if (typeof value === "number") return Number.isFinite(value) ? value : 0;
	if (typeof value !== "string") return 0;

	const raw = value.replace(/[^\d.,-]/g, "").trim();
	if (!raw) return 0;

	const hasComma = raw.includes(",");
	const hasDot = raw.includes(".");
	let normalized = raw;

	if (hasComma && hasDot) {
		const lastComma = raw.lastIndexOf(",");
		const lastDot = raw.lastIndexOf(".");
		const decimalSeparator = lastComma > lastDot ? "," : ".";
		if (decimalSeparator === ",") {
			normalized = raw.replace(/\./g, "").replace(",", ".");
		} else {
			normalized = raw.replace(/,/g, "");
		}
	} else if (hasComma) {
		normalized = raw.replace(",", ".");
	}

	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : 0;
};

const toPeriodicityLabel = (value?: string) => {
	switch ((value ?? "").toUpperCase()) {
		case "MONTHLY":
			return "Mensal";
		case "WEEKLY":
			return "Semanal";
		case "YEARLY":
			return "Anual";
		default:
			return value || "Mensal";
	}
};

const toStatusLabel = (value?: string) => {
	switch ((value ?? "").toUpperCase()) {
		case "ACTIVE":
			return "Ativo";
		case "INACTIVE":
			return "Inativo";
		case "PAUSED":
			return "Pausado";
		default:
			return value || "Ativo";
	}
};

const resolveRecurringContractId = (transaction: TransactionResponse): string | null => {
	const asAny = transaction as unknown as Record<string, unknown>;
	return (
		transaction.recurringContractId ??
		transaction.recurring_contract_id ??
		transaction.contractId ??
		transaction.contract_id ??
		(typeof asAny.recurringContractId === "string" ? asAny.recurringContractId : null) ??
		(typeof asAny.recurring_contract_id === "string" ? asAny.recurring_contract_id : null) ??
		(typeof asAny.contractId === "string" ? asAny.contractId : null) ??
		(typeof asAny.contract_id === "string" ? asAny.contract_id : null) ??
		null
	);
};

const buildFallbackData = (transaction: TransactionResponse | null): RecurringContractViewModel => {
	const title = transaction?.description || "Contrato fixo";
	const amount = Math.abs(parseAmount(transaction?.amount ?? 0)) || 0;
	const amountLabel = formatCurrency(amount || 0);
	return {
		header: {
			title,
			subtitle: "Recorrência mensal",
			amountPerMonthLabel: `${amountLabel} por mês`,
			statusLabel: "Ativo",
			nextChargeDateLabel: toDateLabel(transaction?.depositedDate),
		},
		info: {
			valueLabel: amountLabel,
			periodicityLabel: "Mensal",
			billingDayLabel: "Todo dia -",
			accountName: transaction?.wallet?.name || "-",
			categoryName: transaction?.category?.name || "-",
			createdAtLabel: "-",
		},
		occurrences: [],
		limitsText: "Exibindo últimas 3 pagas e próximas 3 futuras.",
		hasMoreHistory: false,
		summary: {
			totalPaidLabel: formatCurrency(0),
			activeMonthsLabel: "0 meses",
		},
	};
};

const mapApiToView = (data: RecurringContractDetailsResponse, fallback: TransactionResponse): RecurringContractViewModel => {
	const amount = Math.abs(parseAmount(data?.contract?.amount ?? 0));
	const value = Math.abs(parseAmount(data?.recurringInfo?.value ?? amount));
	const totalPaid = Math.abs(parseAmount(data?.financialSummary?.totalPaid ?? 0));

	const occurrences: Occurrence[] = (data?.occurrenceHistory?.items ?? []).map((item, index) => {
		const status: Occurrence["status"] = item.status === "PAID" ? "PAID" : "FUTURE";
		return {
			id: item.id ?? `occ-${index + 1}`,
			date: item.dueDate,
			amountLabel: formatCurrency(Math.abs(parseAmount(item.amount))),
			status,
		};
	});

	return {
		header: {
			title: data?.contract?.title || fallback.description || "Contrato fixo",
			subtitle: "Recorrência mensal",
			amountPerMonthLabel: `${formatCurrency(amount)} por mês`,
			statusLabel: toStatusLabel(data?.contract?.status),
			nextChargeDateLabel: toDateLabel(data?.contract?.nextChargeDate),
		},
		info: {
			valueLabel: formatCurrency(value),
			periodicityLabel: toPeriodicityLabel(data?.recurringInfo?.periodicity),
			billingDayLabel: data?.recurringInfo?.billingDay ? `Todo dia ${data.recurringInfo.billingDay}` : "Todo dia -",
			accountName: data?.recurringInfo?.account?.name || fallback.wallet?.name || "-",
			categoryName: data?.recurringInfo?.category?.name || fallback.category?.name || "-",
			createdAtLabel: data?.recurringInfo?.createdAt ? toDateLabel(data.recurringInfo.createdAt) : "-",
		},
		occurrences,
		limitsText: `Exibindo últimas ${data?.occurrenceHistory?.paidLimit ?? 3} pagas e próximas ${data?.occurrenceHistory?.futureLimit ?? 3} futuras.`,
		hasMoreHistory: Boolean(data?.occurrenceHistory?.hasMoreHistory),
		summary: {
			totalPaidLabel: formatCurrency(totalPaid),
			activeMonthsLabel: `${data?.financialSummary?.activeMonths ?? 0} meses`,
		},
	};
};

export const RecurringContractDetailsDrawer = ({
	open,
	onOpenChange,
	transaction,
}: RecurringContractDetailsDrawerProps) => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<RecurringContractViewModel | null>(null);

	useEffect(() => {
		if (!open || !transaction) return;

		const contractId = resolveRecurringContractId(transaction);
		if (!contractId) {
			setData(buildFallbackData(transaction));
			setError("Contrato fixo sem id válido. Exibindo dados fallback.");
			return;
		}

		let mounted = true;
		const load = async () => {
			setLoading(true);
			setError(null);
			try {
				const response = await RecurringContractService.getRecurringContractDetailsById(contractId);
				if (!mounted) return;
				setData(mapApiToView(response.data as RecurringContractDetailsResponse, transaction));
			} catch (err) {
				if (!mounted) return;
				console.error(err);
				setError("Não foi possível carregar o contrato fixo. Exibindo dados fallback.");
				setData(buildFallbackData(transaction));
			} finally {
				if (mounted) setLoading(false);
			}
		};

		void load();
		return () => {
			mounted = false;
		};
	}, [open, transaction]);

	const viewData = useMemo(() => data ?? buildFallbackData(transaction), [data, transaction]);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-[480px] sm:max-w-[560px] p-0 flex flex-col">
				<SheetHeader className="px-5 py-4 border-b">
					<SheetTitle className="flex items-center gap-2">
						<RotateCw className="h-4 w-4" />
						Contrato fixo
					</SheetTitle>
					<SheetDescription>Recorrência mensal</SheetDescription>
				</SheetHeader>

				{loading && (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-5 w-5 animate-spin mr-2" />
						<span className="text-sm text-muted-foreground">Carregando contrato fixo...</span>
					</div>
				)}

				<ScrollArea className="flex-1 min-h-0 px-5">
					<div className="py-5 space-y-5">
						<div className="space-y-2">
							<p className="text-lg font-semibold">{viewData.header.title}</p>
							<p className="text-sm text-muted-foreground">{viewData.header.subtitle}</p>
							<p className="text-sm font-medium">{viewData.header.amountPerMonthLabel}</p>
							<div className="flex items-center gap-2 flex-wrap">
								<Badge variant="secondary">Status: {viewData.header.statusLabel}</Badge>
								<Badge variant="outline">Recorrente</Badge>
							</div>
							<div className="text-sm space-y-0.5">
								<p className="text-muted-foreground text-xs">Próxima cobrança</p>
								<p>{viewData.header.nextChargeDateLabel}</p>
							</div>
						</div>

						<Separator />

						<div className="space-y-3">
							<p className="text-sm font-semibold">Informações da Recorrência</p>
							<div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
								<div>
									<p className="text-muted-foreground text-xs">Valor</p>
									<p>{viewData.info.valueLabel}</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs">Periodicidade</p>
									<p>{viewData.info.periodicityLabel}</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs">Dia da cobrança</p>
									<p>{viewData.info.billingDayLabel}</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs">Conta / Cartão</p>
									<p>{viewData.info.accountName}</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs">Categoria</p>
									<p>{viewData.info.categoryName}</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs">Criado em</p>
									<p>{viewData.info.createdAtLabel}</p>
								</div>
							</div>
						</div>

						<Separator />

						<div className="space-y-3">
							<p className="text-sm font-semibold">Histórico de Ocorrências</p>
							<div className="space-y-2">
								{viewData.occurrences.length === 0 && (
									<p className="text-sm text-muted-foreground">Sem ocorrências para este contrato.</p>
								)}
								{viewData.occurrences.map(item => (
									<div key={item.id} className="flex items-center justify-between rounded-md border px-3 py-2">
										<div className="flex items-center gap-2 text-sm">
											{item.status === "PAID" ? (
												<CheckCircle2 className="h-4 w-4 text-emerald-600" />
											) : (
												<Clock3 className="h-4 w-4 text-muted-foreground" />
											)}
											<span>{toDateLabel(item.date)} - {item.amountLabel}</span>
										</div>
										<Badge variant={item.status === "PAID" ? "secondary" : "outline"}>
											{item.status === "PAID" ? "Paga" : "Futura"}
										</Badge>
									</div>
								))}
							</div>
							<p className="text-xs text-muted-foreground">{viewData.limitsText}</p>
							<Button
								variant="link"
								className="px-0 h-auto text-sm"
								onClick={() => toast.info("Histórico completo ainda não disponível.")}
								disabled={!viewData.hasMoreHistory}
							>
								Ver histórico completo
							</Button>
						</div>

						<Separator />

						<div className="space-y-2 text-sm">
							<p className="font-semibold">Resumo Financeiro</p>
							<p>Total pago até agora: {viewData.summary.totalPaidLabel}</p>
							<p>Meses ativos: {viewData.summary.activeMonthsLabel}</p>
						</div>
						{error && <p className="text-xs text-amber-600">{error}</p>}
					</div>
				</ScrollArea>

				<SheetFooter className="mt-auto border-t px-5 py-4 bg-background">
					<div className="w-full rounded-lg border p-3 space-y-2">
						<Button
							type="button"
							variant="outline"
							className="w-full"
							onClick={() => toast.info("Ação de pausar recorrência ainda não implementada.")}
						>
							Pausar recorrência
						</Button>
						<Button
							type="button"
							variant="destructive"
							className="w-full"
							onClick={() => {
								const confirmed = window.confirm(
									"Deseja encerrar esta recorrência? As ocorrências já pagas não serão alteradas."
								);
								if (!confirmed) return;
								toast.info("Ação de encerrar recorrência ainda não implementada.");
							}}
						>
							Encerrar recorrência
						</Button>
					</div>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
};
