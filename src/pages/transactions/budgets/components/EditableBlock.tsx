import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CellSumOnlyPopover from "./CellSumOnlyPopover";
import ColGroup from "./ColGroup";
import SectionTitle from "./SectionTitle";
import { PendingEntry, Row } from "../types";
import { formatCurrency } from "@/utils/currency-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ListPlus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type EditableBlockProps = {
  sectionId: string;
  title: string;
  months: string[];
  rows: Row[];
  color?: string;
  footerLabel: string;
  footerValues: number[];
  onUpdateCell: (rowId: string, monthIndex: number, nextValueFactory: (current: number) => number) => void;
  compact?: boolean;
  locale?: string;
  currency?: string;
  isSystemDefault?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddCategory?: () => void;
  editingTitle?: boolean;
  titleInputValue?: string;
  onTitleInputChange?: (value: string) => void;
  onTitleSave?: () => void;
  onTitleCancel?: () => void;
  savingTitle?: boolean;
  hasPendingChanges?: boolean;
  isCellPending?: (sectionId: string, rowId: string, monthIndex: number) => boolean;
  getPendingEntries?: (sectionId: string, rowId: string, monthIndex: number) => PendingEntry[];
  onRegisterPendingEntry?: (payload: {
    sectionId: string;
    rowId: string;
    rowLabel: string;
    monthIndex: number;
    monthLabel: string;
    delta: number;
  }) => void;
  onUndoPendingEntry?: (payload: { sectionId: string; rowId: string; monthIndex: number }) => void;
};

export default function EditableBlock({
  sectionId,
  title,
  months,
  rows,
  color,
  footerLabel,
  footerValues,
  onUpdateCell,
  compact = false,
  locale,
  currency,
  onEdit,
  onDelete,
  onAddCategory,
  isSystemDefault,
  editingTitle = false,
  titleInputValue,
  onTitleInputChange,
  onTitleSave,
  onTitleCancel,
  savingTitle = false,
  hasPendingChanges = false,
  isCellPending,
  getPendingEntries,
  onRegisterPendingEntry,
  onUndoPendingEntry,
}: EditableBlockProps) {

  const hasActions = Boolean(onEdit || onDelete || onAddCategory);
  const canSaveTitle = (titleInputValue ?? "").trim().length > 0;
  const [collapsed, setCollapsed] = useState(false);
  const collapseLabel = collapsed ? "Expandir grupo" : "Recolher grupo";

  return (
    <div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full border border-border text-muted-foreground"
            aria-label={collapseLabel}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((prev) => !prev)}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`} />
          </Button>
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex flex-1 min-w-0 items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <Input
                    value={titleInputValue}
                    onChange={(event) => onTitleInputChange?.(event.target.value)}
                    placeholder="Nome do grupo"
                    className="h-9 sm:w-72"
                    autoFocus
                    disabled={savingTitle}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={onTitleSave}
                    disabled={!canSaveTitle || savingTitle}
                  >
                    {savingTitle ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onTitleCancel}
                    disabled={savingTitle}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <SectionTitle label={title} color={color} />
                {hasPendingChanges && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="relative flex h-3.5 w-3.5 items-center justify-center"
                        aria-label="Alterações pendentes"
                      >
                        <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-sm" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start">
                      Existem alterações pendentes neste grupo
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
          {hasActions && (
            <div className="ml-auto flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-lg leading-none text-muted-foreground"
                    aria-label={`Ações para ${title}`}
                  >
                    ⋮
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {!isSystemDefault && (
                    <>
                      <DropdownMenuItem disabled={!onEdit} onSelect={() => onEdit?.()}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={!onDelete} onSelect={() => onDelete?.()}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem disabled={!onAddCategory} onSelect={() => onAddCategory?.()}>
                    <ListPlus className="h-4 mr-2" />
                    Adicionar categoria
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
      <div className={collapsed ? "hidden" : "mt-2"} aria-hidden={collapsed}>
        <div className="overflow-x-auto border rounded-md">
          <Table className="table-fixed w-full">
            <ColGroup months={months} />
            <TableHeader>
              <TableRow className="bg-zinc-900/90 text-white hover:bg-zinc-900/90">
                <TableHead className="w-[240px] text-white">Meses</TableHead>
                {months.map((m) => (
                  <TableHead key={m} className="w-[120px] text-center text-white">{m}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-transparent">
              <TableCell className="font-medium">{row.label.toLowerCase()}</TableCell>
              {months.map((_, mi) => {
                const pending = isCellPending?.(sectionId, row.id, mi) ?? false;
                const pendingEntries = getPendingEntries?.(sectionId, row.id, mi) ?? [];
                return (
                  <TableCell
                    key={mi}
                        className={cn(
                          "text-right align-middle transition-colors",
                          pending && "bg-amber-50/60 dark:bg-amber-500/10"
                        )}
                        data-pending={pending || undefined}
                      >
                        <CellSumOnlyPopover
                          value={row.values[mi] || 0}
                          onAdd={(delta) => {
                            const monthLabel = months[mi] ?? `Mês ${mi + 1}`;
                            onUpdateCell(row.id, mi, (current) => (current || 0) + delta);
                            onRegisterPendingEntry?.({
                              sectionId,
                              rowId: row.id,
                              rowLabel: row.label,
                              monthIndex: mi,
                              monthLabel,
                              delta,
                            });
                          }}
                          onUndo={() => {
                            onUndoPendingEntry?.({ sectionId, rowId: row.id, monthIndex: mi });
                          }}
                          compact={compact}
                          locale={locale}
                          currency={currency}
                          pending={pending}
                          pendingEntries={pendingEntries}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-zinc-100 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-800">
                <TableCell className="font-semibold text-zinc-800 dark:text-zinc-200">{footerLabel}</TableCell>
                {footerValues.map((value, i) => (
                  <TableCell
                    key={i}
                    className="text-center font-semibold text-zinc-800 dark:text-zinc-200"
                  >
                    {formatCurrency(value, locale, currency)}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>
    </div>
  );
}
