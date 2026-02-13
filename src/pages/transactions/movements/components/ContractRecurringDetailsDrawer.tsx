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
import { formatCurrency, maskCurrencyInput, parseCurrencyInput } from "@/utils/currency-utils";
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

type ContractRecurringDetailsDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	transaction: TransactionResponse | null;
};

type Occurrence = {
	id: string;
	date: string;
	amount: number;
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
		nextChargeDate: string | null;
		endsAt?: string | null;
		ends_at?: string | null;
		createdAt?: string | null;
		created_at?: string | null;
		updatedAt?: string | null;
		updated_at?: string | null;
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
		typeLabel: string;
		amountPerMonthLabel: string;
		statusCode: string;
		statusLabel: string;
		nextChargeDateLabel: string;
		endedAtLabel: string | null;
		endReasonLabel: string | null;
	};
	info: {
		valueLabel: string;
		periodicityLabel: string;
		billingDayLabel: string;
		accountName: string;
		categoryName: string;
		createdAtLabel: string;
		updatedAtLabel: string;
	};
	occurrences: Occurrence[];
	limitsText: string;
	hasMoreHistory: boolean;
	summary: {
		totalPaidLabel: string;
		activeMonthsLabel: string;
	};
};

const toDateLabel = (value?: string | null) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString("pt-BR");
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

const toStatusLabel = (value?: string | null) => {
	switch ((value ?? "").toUpperCase()) {
		case "ACTIVE":
			return "Ativo";
		case "INACTIVE":
			return "Inativo";
		case "PAUSED":
			return "Pausado";
		case "CLOSED":
			return "Encerrado";
		case "CANCELED":
		case "CANCELLED":
			return "Cancelado";
		default:
			return value || "Ativo";
	}
};

const getContractStatusMeta = (status?: string | null) => {
	switch ((status ?? "").toUpperCase()) {
		case "PAUSED":
			return {
				badgeClassName: "border-amber-500/30 bg-amber-500/10 text-amber-300",
				panelClassName: "border-amber-500/30 bg-amber-500/5",
			};
		case "CANCELED":
		case "CANCELLED":
			return {
				badgeClassName: "border-rose-500/30 bg-rose-500/10 text-rose-300",
				panelClassName: "border-rose-500/30 bg-rose-500/5",
			};
		case "CLOSED":
		case "INACTIVE":
			return {
				badgeClassName: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
				panelClassName: "border-zinc-500/30 bg-zinc-500/5",
			};
		case "ACTIVE":
		default:
			return {
				badgeClassName: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
				panelClassName: "border-emerald-500/30 bg-emerald-500/5",
			};
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
			typeLabel: "Recorrência mensal",
			amountPerMonthLabel: `${amountLabel} por mês`,
			statusCode: "ACTIVE",
			statusLabel: "Ativo",
			nextChargeDateLabel: toDateLabel(transaction?.depositedDate),
			endedAtLabel: null,
			endReasonLabel: null,
		},
		info: {
			valueLabel: amountLabel,
			periodicityLabel: "Mensal",
			billingDayLabel: "Todo dia -",
			accountName: transaction?.wallet?.name || "-",
			categoryName: transaction?.category?.name || "-",
			createdAtLabel: "-",
			updatedAtLabel: "-",
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
	const normalizedStatus = normalizeContractStatus(data?.contract?.status);

	const occurrences: Occurrence[] = (data?.occurrenceHistory?.items ?? []).map((item, index) => {
		const status: Occurrence["status"] = item.status === "PAID" ? "PAID" : "FUTURE";
		const amountValue = Math.abs(parseAmount(item.amount));
		return {
			id: item.id ?? `occ-${index + 1}`,
			date: item.dueDate,
			amount: amountValue,
			amountLabel: formatCurrency(amountValue),
			status,
		};
	});

	const contractData = (data?.contract ?? {}) as Record<string, unknown>;
	const endedAtRaw =
		(typeof contractData.canceledAt === "string" ? contractData.canceledAt : null) ??
		(typeof contractData.cancelledAt === "string" ? contractData.cancelledAt : null) ??
		(typeof contractData.closedAt === "string" ? contractData.closedAt : null) ??
		(typeof contractData.endedAt === "string" ? contractData.endedAt : null) ??
		(typeof contractData.endsAt === "string" ? contractData.endsAt : null) ??
		(typeof contractData.ends_at === "string" ? contractData.ends_at : null) ??
		null;
	const createdAtRaw =
		(typeof contractData.createdAt === "string" ? contractData.createdAt : null) ??
		(typeof contractData.created_at === "string" ? contractData.created_at : null) ??
		(typeof data?.recurringInfo?.createdAt === "string" ? data.recurringInfo.createdAt : null) ??
		null;
	const updatedAtRaw =
		(typeof contractData.updatedAt === "string" ? contractData.updatedAt : null) ??
		(typeof contractData.updated_at === "string" ? contractData.updated_at : null) ??
		null;
	const endReasonRaw =
		(typeof contractData.cancelReason === "string" ? contractData.cancelReason : null) ??
		(typeof contractData.cancellationReason === "string" ? contractData.cancellationReason : null) ??
		(typeof contractData.closeReason === "string" ? contractData.closeReason : null) ??
		(typeof contractData.reason === "string" ? contractData.reason : null) ??
		null;

	return {
		header: {
			title: data?.contract?.title || fallback.description || "Contrato fixo",
			typeLabel: "Recorrência mensal",
			amountPerMonthLabel: `${formatCurrency(amount)} por mês`,
			statusCode: normalizedStatus,
			statusLabel: toStatusLabel(normalizedStatus),
			nextChargeDateLabel: toDateLabel(data?.contract?.nextChargeDate),
			endedAtLabel: endedAtRaw ? toDateLabel(endedAtRaw) : null,
			endReasonLabel: endReasonRaw || null,
		},
		info: {
			valueLabel: formatCurrency(value),
			periodicityLabel: toPeriodicityLabel(data?.recurringInfo?.periodicity),
			billingDayLabel: data?.recurringInfo?.billingDay ? `Todo dia ${data.recurringInfo.billingDay}` : "Todo dia -",
			accountName: data?.recurringInfo?.account?.name || fallback.wallet?.name || "-",
			categoryName: data?.recurringInfo?.category?.name || fallback.category?.name || "-",
			createdAtLabel: createdAtRaw ? toDateLabel(createdAtRaw) : "-",
			updatedAtLabel: updatedAtRaw ? toDateLabel(updatedAtRaw) : "-",
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

export const ContractRecurringDetailsDrawer = ({
	open,
	onOpenChange,
	transaction,
}: ContractRecurringDetailsDrawerProps) => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<RecurringContractViewModel | null>(null);
	const [isEditAmountOpen, setIsEditAmountOpen] = useState(false);
	const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null);
	const [amountInput, setAmountInput] = useState("");
	const [scope, setScope] = useState<"single" | "future">("single");
	const [savingAmount, setSavingAmount] = useState(false);
	const [isPausingContract, setIsPausingContract] = useState(false);
	const [isClosingContract, setIsClosingContract] = useState(false);
	const [pendingContractAction, setPendingContractAction] = useState<
		"pause" | "resume" | "close" | "reactivate" | "delete" | null
	>(null);

	const contractId = useMemo(
		() => (transaction ? resolveRecurringContractId(transaction) : null),
		[transaction]
	);

	useEffect(() => {
		if (!open || !transaction) return;

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
	}, [open, transaction, contractId]);

	useEffect(() => {
		if (!open) {
			setIsEditAmountOpen(false);
			setSelectedOccurrence(null);
			setAmountInput("");
			setScope("single");
			setPendingContractAction(null);
		}
	}, [open]);

	const viewData = useMemo(() => data ?? buildFallbackData(transaction), [data, transaction]);
	const statusMeta = useMemo(
		() => getContractStatusMeta(viewData.header.statusCode),
		[viewData.header.statusCode]
	);
	const isActiveContract = viewData.header.statusCode === "ACTIVE";
	const isPausedContract = viewData.header.statusCode === "PAUSED";
	const isCanceledContract = viewData.header.statusCode === "CANCELED";
	const isClosedContract =
		viewData.header.statusCode === "CLOSED" || viewData.header.statusCode === "INACTIVE" || isCanceledContract;
	const parsedPreviewAmount = parseCurrencyInput(amountInput);
	const previewAmount = Number.isNaN(parsedPreviewAmount) ? 0 : parsedPreviewAmount;

	const openEditAmountModal = (occurrence: Occurrence) => {
		setSelectedOccurrence(occurrence);
		setAmountInput(maskCurrencyInput(String(Math.round(Math.abs(occurrence.amount) * 100))));
		setScope("single");
		setIsEditAmountOpen(true);
	};

	const handleSaveOccurrenceAmount = async () => {
		if (!contractId || !selectedOccurrence) return;
		const dueDate = toIsoDate(selectedOccurrence.date);
		if (!dueDate) {
			toast.error("Não foi possível identificar a data da ocorrência.");
			return;
		}

		const parsedAmount = parseCurrencyInput(amountInput);
		if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
			toast.error("Informe um valor válido.");
			return;
		}

		setSavingAmount(true);
		try {
			if (scope === "future") {
				await RecurringContractService.updateOccurrenceAmountFuture(
					contractId,
					dueDate,
					parsedAmount.toFixed(2)
				);
			} else {
				await RecurringContractService.updateOccurrenceAmount(
					contractId,
					dueDate,
					parsedAmount.toFixed(2)
				);
			}

			const response = await RecurringContractService.getRecurringContractDetailsById(contractId);
			setData(mapApiToView(response.data as RecurringContractDetailsResponse, transaction as TransactionResponse));

			toast.success("Valor atualizado com sucesso.");
			setIsEditAmountOpen(false);
		} catch (err) {
			console.error(err);
			toast.error("Não foi possível atualizar o valor da ocorrência.");
		} finally {
			setSavingAmount(false);
		}
	};

	const reloadContractDetails = async () => {
		if (!contractId || !transaction) return;
		const response = await RecurringContractService.getRecurringContractDetailsById(contractId);
		setData(mapApiToView(response.data as RecurringContractDetailsResponse, transaction));
	};

	const handlePauseContract = async () => {
		if (!contractId) return;
		if (!isActiveContract && !isPausedContract) {
			toast.info("Este contrato não pode ser pausado/retomado.");
			return;
		}
		setPendingContractAction(isPausedContract ? "resume" : "pause");
	};

	const handleReactivateContract = () => {
		if (!contractId) return;
		setPendingContractAction("reactivate");
	};

	const handleDeleteContract = () => {
		if (!contractId) return;
		setPendingContractAction("delete");
	};

	const handleCloseContract = async () => {
		if (!contractId) return;
		if (isClosedContract) {
			toast.info("Este contrato já está encerrado.");
			return;
		}
		setPendingContractAction("close");
	};

	const handleConfirmContractAction = async () => {
		if (!contractId || !pendingContractAction) return;

		if (
			pendingContractAction === "pause" ||
			pendingContractAction === "resume" ||
			pendingContractAction === "reactivate"
		) {
			setIsPausingContract(true);
			try {
				if (pendingContractAction === "resume" || pendingContractAction === "reactivate") {
					await RecurringContractService.resumeContract(contractId);
				} else {
					await RecurringContractService.pauseContract(contractId);
				}
				await reloadContractDetails();
				toast.success(
					pendingContractAction === "resume" || pendingContractAction === "reactivate"
						? "Contrato reativado com sucesso."
						: "Contrato pausado com sucesso."
				);
				setPendingContractAction(null);
			} catch (err) {
				console.error(err);
				toast.error(
					pendingContractAction === "resume" || pendingContractAction === "reactivate"
						? "Não foi possível reativar o contrato."
						: "Não foi possível pausar o contrato."
				);
			} finally {
				setIsPausingContract(false);
			}
			return;
		}

		if (pendingContractAction === "delete") {
			toast.info("Exclusão definitiva ainda não implementada.");
			setPendingContractAction(null);
			return;
		}

		setIsClosingContract(true);
		try {
			await RecurringContractService.closeContract(contractId);
			await reloadContractDetails();
			toast.success("Contrato encerrado com sucesso.");
			setPendingContractAction(null);
		} catch (err) {
			console.error(err);
			toast.error("Não foi possível encerrar o contrato.");
		} finally {
			setIsClosingContract(false);
		}
	};

	const isConfirmingContractAction =
		pendingContractAction === "pause" ||
		pendingContractAction === "resume" ||
		pendingContractAction === "reactivate"
			? isPausingContract
			: isClosingContract;

	const confirmContractActionTitle =
		pendingContractAction === "pause"
			? "Pausar recorrência"
			: pendingContractAction === "resume"
				? "Retomar recorrência"
				: pendingContractAction === "reactivate"
					? "Reativar contrato"
					: pendingContractAction === "delete"
						? "Excluir definitivamente"
						: "Encerrar recorrência";
	const confirmContractActionDescription =
		pendingContractAction === "pause"
			? "Deseja pausar este contrato recorrente?"
			: pendingContractAction === "resume"
				? "Deseja retomar este contrato recorrente?"
				: pendingContractAction === "reactivate"
					? "Deseja reativar este contrato recorrente?"
					: pendingContractAction === "delete"
						? "Deseja excluir definitivamente este contrato?"
						: "Deseja encerrar esta recorrência? As ocorrências já pagas não serão alteradas.";
	const confirmContractActionLabel =
		pendingContractAction === "pause"
			? "Pausar contrato"
			: pendingContractAction === "resume"
				? "Retomar contrato"
				: pendingContractAction === "reactivate"
					? "Reativar contrato"
					: pendingContractAction === "delete"
						? "Excluir definitivamente"
						: "Encerrar contrato";

	return (
		<>
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
						<div className={`space-y-2 rounded-lg border p-3 ${statusMeta.panelClassName}`}>
							<p className="text-lg font-semibold">{viewData.header.title}</p>
							<p className="text-sm text-muted-foreground">Tipo: {viewData.header.typeLabel}</p>
							<p className="text-sm font-medium">{viewData.header.amountPerMonthLabel}</p>
							<div className="flex items-center gap-2 flex-wrap">
								<Badge variant="outline" className={statusMeta.badgeClassName}>
									Status: {viewData.header.statusLabel}
								</Badge>
							</div>
							<div className="text-sm space-y-0.5">
								<p className="text-muted-foreground text-xs">Próxima cobrança</p>
								<p>{isClosedContract ? "-" : viewData.header.nextChargeDateLabel}</p>
							</div>
								{isCanceledContract && (
									<div className="rounded-md border border-zinc-500/25 bg-zinc-500/5 p-2 text-xs space-y-1">
										<p>Encerrado em: {viewData.header.endedAtLabel ?? "-"}</p>
										<p>Motivo: {viewData.header.endReasonLabel ?? "Encerrado manualmente"}</p>
									</div>
								)}
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
								<div>
									<p className="text-muted-foreground text-xs">Atualizado em</p>
									<p>{viewData.info.updatedAtLabel}</p>
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
										<div className="flex items-center gap-2">
											<Badge variant={item.status === "PAID" ? "secondary" : "outline"}>
												{item.status === "PAID" ? "Paga" : "Futura"}
											</Badge>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="h-7 px-2 text-xs"
												onClick={() => openEditAmountModal(item)}
											>
												Ajustar valor
											</Button>
										</div>
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
						{isCanceledContract ? (
							<>
								<Button
									type="button"
									variant="outline"
									className="w-full"
									onClick={handleReactivateContract}
									disabled={isPausingContract || isClosingContract}
								>
									Reativar contrato
								</Button>
								<Button
									type="button"
									variant="destructive"
									className="w-full"
									onClick={handleDeleteContract}
									disabled={isPausingContract || isClosingContract}
								>
									Excluir definitivamente
								</Button>
							</>
						) : (
							<>
								<Button
									type="button"
									variant="outline"
									className="w-full"
									onClick={handlePauseContract}
									disabled={isPausingContract || isClosingContract || isClosedContract}
								>
									{isPausingContract ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											{isPausedContract ? "Retomando..." : "Pausando..."}
										</>
									) : (
										isPausedContract ? "Retomar recorrência" : "Pausar recorrência"
									)}
								</Button>
								<Button
									type="button"
									variant="destructive"
									className="w-full"
									onClick={handleCloseContract}
									disabled={isPausingContract || isClosingContract || isClosedContract}
								>
									{isClosingContract ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Encerrando...
										</>
									) : (
										"Encerrar recorrência"
									)}
								</Button>
							</>
						)}
					</div>
				</SheetFooter>
			</SheetContent>
		</Sheet>
		<Dialog open={pendingContractAction !== null} onOpenChange={(open) => !open && setPendingContractAction(null)}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{confirmContractActionTitle}</DialogTitle>
					<DialogDescription>{confirmContractActionDescription}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={() => setPendingContractAction(null)}>
						Cancelar
					</Button>
					<Button
						type="button"
						variant={pendingContractAction === "close" || pendingContractAction === "delete" ? "destructive" : "default"}
						onClick={handleConfirmContractAction}
						disabled={isConfirmingContractAction}
					>
						{isConfirmingContractAction ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
						{confirmContractActionLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
		<Dialog open={isEditAmountOpen} onOpenChange={setIsEditAmountOpen}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Ajustar valor da parcela</DialogTitle>
					<DialogDescription>
						Defina o novo valor e como aplicar a mudança.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="occurrence-amount">Novo valor</Label>
						<Input
							id="occurrence-amount"
							inputMode="numeric"
							placeholder="0,00"
							value={amountInput}
							onChange={(e) => setAmountInput(maskCurrencyInput(e.target.value))}
						/>
					</div>
					<div className="space-y-2">
						<Label>Como aplicar a mudança?</Label>
						<div className="space-y-2">
							<label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer">
								<input
									type="radio"
									name="apply-scope"
									value="single"
									checked={scope === "single"}
									onChange={() => setScope("single")}
								/>
								<span>Apenas esta parcela</span>
							</label>
							<label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer">
								<input
									type="radio"
									name="apply-scope"
									value="future"
									checked={scope === "future"}
									onChange={() => setScope("future")}
								/>
								<span>Esta e todas as futuras</span>
							</label>
						</div>
					</div>
					<p className="text-xs text-muted-foreground">
						A alteração não afeta parcelas já pagas.
					</p>
					<div className="rounded-md border bg-muted/20 p-3 text-sm space-y-1">
						<p>Valor atual: {selectedOccurrence ? formatCurrency(selectedOccurrence.amount) : "-"}</p>
						<p>Novo valor: {formatCurrency(previewAmount)}</p>
					</div>
				</div>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={() => setIsEditAmountOpen(false)}>
						Cancelar
					</Button>
					<Button type="button" onClick={handleSaveOccurrenceAmount} disabled={savingAmount}>
						{savingAmount ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
						Salvar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
		</>
	);
};
const normalizeContractStatus = (status?: string | null) => {
	const normalized = String(status ?? "ACTIVE").toUpperCase();
	if (normalized === "CANCELLED") return "CANCELED";
	return normalized;
};
