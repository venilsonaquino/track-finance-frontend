import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const months = [
	"Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
	"Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

interface MonthYearPickerProps {
	date: Date;
	onChange: (date: Date) => void;
	mode?: "month-year" | "year";
	className?: string;
}

export function MonthYearPicker({
	date,
	onChange,
	mode = "month-year",
	className,
}: MonthYearPickerProps) {
	const year = date.getFullYear();
	const monthIndex = date.getMonth();
	const showMonthControls = mode === "month-year";

	const currentYear = new Date().getFullYear();
	const startYear = Math.min(currentYear, year) - 5;
	const endYear = Math.max(currentYear, year) + 5;
	const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

	const handleMonthSelect = (value: string) => {
		const nextMonth = Number(value);
		const newDate = new Date(date);
		newDate.setMonth(nextMonth);
		onChange(newDate);
	};

	const handleYearSelect = (value: string) => {
		const nextYear = Number(value);
		const newDate = new Date(date);
		newDate.setFullYear(nextYear);
		onChange(newDate);
	};

	const label = showMonthControls
		? `${months[monthIndex]} ${year}`
		: `${year}`;

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn("gap-2 font-medium text-foreground", className)}
				>
					{label}
					<ChevronDown className="h-4 w-4 text-muted-foreground" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-[220px] p-3">
				<div className="grid gap-3">
					{showMonthControls && (
						<Select value={String(monthIndex)} onValueChange={handleMonthSelect}>
							<SelectTrigger>
								<SelectValue placeholder="Mês" />
							</SelectTrigger>
							<SelectContent>
								{months.map((month, index) => (
									<SelectItem key={month} value={String(index)}>
										{month}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
					<Select value={String(year)} onValueChange={handleYearSelect}>
						<SelectTrigger>
							<SelectValue placeholder="Ano" />
						</SelectTrigger>
						<SelectContent>
							{years.map((y) => (
								<SelectItem key={y} value={String(y)}>
									{y}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</PopoverContent>
		</Popover>
	);
}
