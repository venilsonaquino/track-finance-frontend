import React, { useEffect, useMemo, useState } from "react";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter, X, Calendar, Tag, Check, Wallet, Clock } from "lucide-react";
import { useCategories } from "../../hooks/use-categories";
import { useWallets } from "../../hooks/use-wallets";
import { DateUtils } from "@/utils/date-utils";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type TimelineFilter = "realizadas" | "futuras" | "todas";
type PeriodPreset = "month" | "last30" | "custom";

interface FiltersState {
	startDate: string;
	endDate: string;
	categoryIds: string[];
	timeline: TimelineFilter;
	periodPreset: PeriodPreset;
	walletId: string | null;
}

interface FilterSheetProps {
	onApplyFilters: (filters: FiltersState | null) => void;
	activeFilters: FiltersState | null;
}

export const FilterSheet: React.FC<FilterSheetProps> = ({ onApplyFilters, activeFilters }) => {
	const { categories, loading: categoriesLoading } = useCategories();
	const { wallets, loading: walletsLoading } = useWallets();
	const [isOpen, setIsOpen] = useState(false);
	
	// Definir datas padrão do mês atual
	const defaultDates = DateUtils.getMonthStartAndEnd(new Date());
	const [startDate, setStartDate] = useState(defaultDates.startDate);
	const [endDate, setEndDate] = useState(defaultDates.endDate);
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
	const [timeline, setTimeline] = useState<TimelineFilter>("todas");
	const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("month");
	const [walletId, setWalletId] = useState<string>("all");
	const [appliedFiltersCount, setAppliedFiltersCount] = useState<number>(0);

	const activeFiltersCount = useMemo(() => {
		const flags = [
			periodPreset !== "month",
			timeline !== "todas",
			walletId !== "all",
			selectedCategories.length > 0,
		];
		return flags.filter(Boolean).length;
	}, [periodPreset, timeline, walletId, selectedCategories.length]);

	const countFilters = (filters: FiltersState | null) => {
		if (!filters) return 0;
		const flags = [
			filters.periodPreset !== "month",
			filters.timeline !== "todas",
			Boolean(filters.walletId),
			filters.categoryIds.length > 0,
		];
		return flags.filter(Boolean).length;
	};

	useEffect(() => {
		if (isOpen) return;
		if (!activeFilters) {
			setStartDate(defaultDates.startDate);
			setEndDate(defaultDates.endDate);
			setSelectedCategories([]);
			setTimeline("todas");
			setPeriodPreset("month");
			setWalletId("all");
			setAppliedFiltersCount(0);
			return;
		}
		setStartDate(activeFilters.startDate);
		setEndDate(activeFilters.endDate);
		setSelectedCategories(activeFilters.categoryIds);
		setTimeline(activeFilters.timeline);
		setPeriodPreset(activeFilters.periodPreset);
		setWalletId(activeFilters.walletId ?? "all");
		setAppliedFiltersCount(countFilters(activeFilters));
	}, [activeFilters, defaultDates.endDate, defaultDates.startDate, isOpen]);

	const handleApplyFilters = () => {
		if (activeFiltersCount === 0) {
			onApplyFilters(null);
		} else {
			onApplyFilters({
				startDate: startDate || defaultDates.startDate,
				endDate: endDate || defaultDates.endDate,
				categoryIds: selectedCategories,
				timeline,
				periodPreset,
				walletId: walletId === "all" ? null : walletId,
			});
		}
		setIsOpen(false);
		setAppliedFiltersCount(activeFiltersCount);
	};

	const handleClearFilters = () => {
		setStartDate(defaultDates.startDate);
		setEndDate(defaultDates.endDate);
		setSelectedCategories([]);
		setTimeline("todas");
		setPeriodPreset("month");
		setWalletId("all");
		setIsOpen(false);
		onApplyFilters(null);
		setAppliedFiltersCount(0);
	};

	const handleCategoryToggle = (categoryId: string) => {
		setSelectedCategories(prev => 
			prev.includes(categoryId)
				? prev.filter(id => id !== categoryId)
				: [...prev, categoryId]
		);
	};

	const handlePeriodPresetChange = (value: PeriodPreset) => {
		setPeriodPreset(value);
		if (value === "month") {
			setStartDate(defaultDates.startDate);
			setEndDate(defaultDates.endDate);
			return;
		}
		if (value === "last30") {
			const today = new Date();
			const past = new Date();
			past.setDate(today.getDate() - 29);
			setStartDate(DateUtils.formatToISODate(past));
			setEndDate(DateUtils.formatToISODate(today));
		}
	};

	const hasActiveFilters = appliedFiltersCount > 0;
	const hasDraftFilters = activeFiltersCount > 0;

	return (
		<Sheet open={isOpen} onOpenChange={setIsOpen}>
			<SheetTrigger asChild>
				<Button variant="outline">
					<Filter className="h-4 w-4 mr-2" />
					Filtros
					{hasActiveFilters ? ` (${appliedFiltersCount})` : ""}
				</Button>
			</SheetTrigger>
			<SheetContent side="right" className="w-[400px] sm:w-[480px] p-0">
				<div className="flex flex-col h-full">
					{/* Header */}
					<SheetHeader className="px-4 py-4">
						<div className="flex items-start justify-between">
							<SheetTitle className="text-base font-semibold">Filtros</SheetTitle>
							{hasActiveFilters && (
								<Badge
									variant="secondary"
									className="text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-100"
								>
									{appliedFiltersCount} ativos
								</Badge>
							)}
						</div>
						<p className="text-xs text-muted-foreground">
							Personalize sua visualização de transações
						</p>
					</SheetHeader>

					{/* Content */}
					<div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
						{/* Timeline Section */}
						<div className="space-y-3">
							<div className="flex items-center space-x-2">
								<Clock className="h-4 w-4 text-muted-foreground" />
								<h3 className="text-xs font-medium text-muted-foreground">Linha do tempo</h3>
							</div>
							<div className="grid grid-cols-3 gap-2">
								{([
									{ value: "realizadas", label: "Realizadas" },
									{ value: "futuras", label: "Futuras" },
									{ value: "todas", label: "Todas" },
								] as const).map(option => {
									const isSelected = timeline === option.value;
									return (
										<button
											key={option.value}
											type="button"
											onClick={() => setTimeline(option.value)}
											className={`h-9 rounded-md border text-xs font-medium transition-colors ${
												isSelected
													? "border-blue-200 bg-blue-50 text-blue-700"
													: "border-border text-muted-foreground hover:text-foreground"
											}`}
										>
											{option.label}
										</button>
									);
								})}
							</div>
							<p className="text-xs text-muted-foreground">
								Inclui parcelas agendadas quando selecionado.
							</p>
						</div>

						{/* Period Section */}
						<div className="space-y-3">
							<div className="flex items-center space-x-2">
								<Calendar className="h-4 w-4 text-muted-foreground" />
								<h3 className="text-xs font-medium text-muted-foreground">Período</h3>
							</div>

							<Select value={periodPreset} onValueChange={handlePeriodPresetChange}>
							<SelectTrigger className="h-9 w-full">
								<SelectValue placeholder="Selecionar período" />
							</SelectTrigger>
								<SelectContent>
									<SelectItem value="month">Este mês</SelectItem>
									<SelectItem value="last30">Últimos 30 dias</SelectItem>
									<SelectItem value="custom">Personalizado</SelectItem>
								</SelectContent>
							</Select>

							{periodPreset === "custom" && (
								<div className="grid grid-cols-2 gap-3">
									<div className="space-y-2">
										<Label htmlFor="start-date" className="text-xs font-medium text-muted-foreground">
											Data inicial
										</Label>
										<Input
											id="start-date"
											type="date"
											value={startDate}
											onChange={(e) => setStartDate(e.target.value)}
											className="h-9 text-sm"
										/>
									</div>
									
									<div className="space-y-2">
										<Label htmlFor="end-date" className="text-xs font-medium text-muted-foreground">
											Data final
										</Label>
										<Input
											id="end-date"
											type="date"
											value={endDate}
											onChange={(e) => setEndDate(e.target.value)}
											className="h-9 text-sm"
										/>
									</div>
								</div>
							)}
						</div>

						{/* Account Section */}
						<div className="space-y-3">
							<div className="flex items-center space-x-2">
								<Wallet className="h-4 w-4 text-muted-foreground" />
								<h3 className="text-xs font-medium text-muted-foreground">Conta</h3>
							</div>
							<Select
								value={walletId}
								onValueChange={setWalletId}
								disabled={walletsLoading}
							>
							<SelectTrigger className="h-9 w-full">
								<SelectValue placeholder="Todas as carteiras" />
							</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Todas as carteiras</SelectItem>
									{walletsLoading ? (
										<SelectItem value="loading" disabled>Carregando...</SelectItem>
									) : wallets.length === 0 ? (
										<SelectItem value="empty" disabled>Nenhuma carteira encontrada</SelectItem>
									) : (
										wallets.map(wallet => (
											<SelectItem key={wallet.id} value={wallet.id!}>
												<span className="truncate">{wallet.name}</span>
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
						</div>

						{/* Categories Section */}
						<div className="space-y-3">
							<div className="flex items-center space-x-2">
								<Tag className="h-4 w-4 text-muted-foreground" />
								<h3 className="text-xs font-medium text-muted-foreground">Categorias</h3>
								{selectedCategories.length > 0 && (
									<Badge variant="secondary" className="text-xs">
										{selectedCategories.length} selecionada{selectedCategories.length > 1 ? 's' : ''}
									</Badge>
								)}
							</div>
							
							{categoriesLoading ? (
								<div className="flex items-center justify-center py-8">
									<div className="text-sm text-muted-foreground">
										Carregando categorias...
									</div>
								</div>
							) : (
								<div className="space-y-2 max-h-100 overflow-y-auto pr-2">
									{categories.map((category) => {
										const isSelected = selectedCategories.includes(category.id);
										return (
											<button
												key={category.id}
												onClick={() => handleCategoryToggle(category.id)}
												className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 hover:bg-muted/50 ${
													isSelected 
														? 'border-blue-200 bg-blue-50/50' 
														: 'border-border hover:border-border/60'
												}`}
											>
												<div className="flex items-center space-x-3">
													<div
														className={`w-3 h-3 rounded-full transition-all duration-200 ${
															isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
														}`}
														style={{ backgroundColor: category.color }}
													/>
													<span className={`text-sm font-medium transition-colors ${
														isSelected ? 'text-blue-700' : 'text-foreground'
													}`}>
														{category.name}
													</span>
												</div>
												{isSelected && (
													<Check className="h-4 w-4 text-blue-600" />
												)}
											</button>
										);
									})}
								</div>
							)}
						</div>
					</div>

					{/* Footer */}
					<SheetFooter className="px-4 py-4 border-t">
						<div className="flex gap-3 w-full">
							<Button
								variant="ghost"
								onClick={handleClearFilters}
								className="flex-1 h-10"
								disabled={!hasDraftFilters}
							>
								<X className="h-4 w-4 mr-2" />
								Limpar
							</Button>
							<Button 
								onClick={handleApplyFilters} 
								className="flex-1 h-10"
							>
								Aplicar Filtros
							</Button>
						</div>
					</SheetFooter>
				</div>
			</SheetContent>
		</Sheet>
	);
};
