import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "@radix-ui/react-dropdown-menu";
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

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	toolbar?: React.ReactNode;
	headerTitle?: string;
	headerPeriod?: React.ReactNode;
	headerSheet?: React.ReactNode;
}

export function DataTable<TData, TValue>({
	columns,
	data,
	toolbar,
	headerTitle,
	headerPeriod,
	headerSheet,
}: DataTableProps<TData, TValue>) {
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

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
			<div className="flex items-center justify-center py-4 ">
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
			<div className="rounded-md border overflow-x-auto">
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
											{headerPeriod && (
												<span className="text-sm text-muted-foreground">
													{headerPeriod}
												</span>
											)}
										</div>
										{headerSheet && <div className="flex items-center">{headerSheet}</div>}
									</div>
								</TableHead>
							</TableRow>
						)}
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id}>
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
