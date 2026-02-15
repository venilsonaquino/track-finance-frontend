import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	useReactTable,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	flexRender,
	ColumnDef,
	VisibilityState,
} from "@tanstack/react-table";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	toolbar?: React.ReactNode;
	headerTitle?: string;
	headerPeriod?: React.ReactNode;
	headerSheet?: React.ReactNode;
	variant?: "default" | "budget";
}

export function DataTable<TData, TValue>({
	columns,
	data,
	toolbar,
	headerTitle,
	headerPeriod,
	headerSheet,
	variant = "default",
}: DataTableProps<TData, TValue>) {
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const isBudget = variant === "budget";

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		state: {
			columnVisibility,
		},
	});

	return (
		<>
			<div className="">
				{/* <Input
					placeholder="Filtrar por nome..."
					value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
					onChange={(event) =>
						table.getColumn("name")?.setFilterValue(event.target.value)
					}
					className="max-w-sm"
				/> */}

					{toolbar}

				{/* <DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" className="ml-auto">
							Colunas
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{table
							.getAllColumns()
							.filter((column) => column.getCanHide())
							.map((column) => {
								if(column.id === "actions") return null;
								return (
									<DropdownMenuCheckboxItem
										key={column.id}
										className="capitalize"
										checked={column.getIsVisible()}
										onCheckedChange={(value) => column.toggleVisibility(!!value)}
									>
										{column.id}
									</DropdownMenuCheckboxItem>
								);
							})}
					</DropdownMenuContent>
				</DropdownMenu> */}
			</div>
			<div
				className={cn(
					"border overflow-x-auto",
					isBudget ? "rounded-xl bg-background/40 shadow-sm" : "rounded-md"
				)}
			>
				<Table className="min-w-[100px]">
					<TableHeader>
						{(headerTitle || headerPeriod || headerSheet) && (
							<TableRow>
								<TableHead colSpan={columns.length} className="p-0">
									<div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
										<div className="flex items-center gap-3">
											{headerTitle && (
												<span className="text-base font-semibold text-foreground">
													{headerTitle}
												</span>
											)}
										</div>
										<div className="flex flex-wrap items-center gap-2">
											{headerPeriod && (
												<span className="text-sm text-muted-foreground">
													{headerPeriod}
												</span>
											)}
											{headerSheet && <div className="flex items-center">{headerSheet}</div>}
										</div>
									</div>
								</TableHead>
							</TableRow>
						)}
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow
								key={headerGroup.id}
								className={cn(
									isBudget && "bg-zinc-900/90 text-white hover:bg-zinc-900/90"
								)}
							>
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										className={cn(isBudget && "text-white")}
									>
										{header.isPlaceholder
											? null
											: flexRender(header.column.columnDef.header, header.getContext())}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody> 
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={columns.length} className="h-24 text-center">
									Nenhum resultado encontrado.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
				<div className="flex items-center justify-end space-x-2 py-4">
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						Anterior
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						Próxima
					</Button>
				</div>
			</div>
		</>
	);
}
