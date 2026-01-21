import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import PageBreadcrumbNav from "@/components/BreadcrumbNav";
import ReadOnlyBlock from "./components/ReadOnlyBlock";
import EditableBlock from "./components/EditableBlock";
import { EditableSectionState, MonthKey, PendingEntry, SectionEditable } from "./types";
import ManageGroupsSheet from "./components/ManageGroupsSheet";
import { useBudgetOverview, useBudgetGroupsCrud } from "../hooks/use-budget-group";
import { MonthYearPicker } from "../movements/components/MonthYearPicker";
import { toast } from "sonner";
import AddCategoryDialog from "./components/AddCategoryDialog";
import DeleteGroupDialog from "./components/DeleteGroupDialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Pin, PinOff } from "lucide-react";
import CreateGroupDialog from "./components/CreateGroupDialog";

const MONTH_LABELS_MAP: Record<MonthKey, string> = {
  Jan: "Janeiro",
  Fev: "Fevereiro",
  Mar: "Março",
  Abr: "Abril",
  Mai: "Maio",
  Jun: "Junho",
  Jul: "Julho",
  Ago: "Agosto",
  Set: "Setembro",
  Out: "Outubro",
  Nov: "Novembro",
  Dez: "Dezembro",
};

const ALLOW_NEGATIVE_VALUES = false;

type DraftState = {
  editableSections: EditableSectionState[];
  pendingByCell: Record<string, PendingEntry[]>;
  draftDirty: boolean;
};

type DraftAction =
  | { type: "INIT_FROM_SERVER"; sections: EditableSectionState[] }
  | { type: "INIT_FROM_DRAFT"; sections: EditableSectionState[]; pendingByCell: Record<string, PendingEntry[]> }
  | { type: "SET_SECTIONS"; sections: EditableSectionState[]; markDirty?: boolean }
  | { type: "REMOVE_SECTION"; sectionId: string }
  | {
      type: "ADD_DELTA";
      payload: {
        sectionId: string;
        rowId: string;
        rowLabel: string;
        monthIndex: number;
        monthLabel: string;
        delta: number;
      };
    }
  | { type: "UNDO_LAST_CELL"; payload: { sectionId: string; rowId: string; monthIndex: number } }
  | { type: "DRAFT_SAVED" };

const buildCellKey = (sectionId: string, rowId: string, monthIndex: number) =>
  `${sectionId}:${rowId}:${monthIndex}`;

const applyDeltaToSections = (
  sections: EditableSectionState[],
  payload: { sectionId: string; rowId: string; monthIndex: number },
  delta: number
) =>
  sections.map((section) => {
    if (section.id !== payload.sectionId) return section;
    return {
      ...section,
      rows: section.rows.map((row) => {
        if (row.id !== payload.rowId) return row;
        const currentValue = row.values[payload.monthIndex] || 0;
        const nextValue = currentValue + delta;
        const finalValue = ALLOW_NEGATIVE_VALUES ? nextValue : Math.max(0, nextValue);
        return {
          ...row,
          values: row.values.map((value, idx) => (idx === payload.monthIndex ? finalValue : value)),
        };
      }),
    };
  });

const draftReducer = (state: DraftState, action: DraftAction): DraftState => {
  switch (action.type) {
    case "INIT_FROM_SERVER":
      return { editableSections: action.sections, pendingByCell: {}, draftDirty: false };
    case "INIT_FROM_DRAFT":
      return {
        editableSections: action.sections,
        pendingByCell: action.pendingByCell ?? {},
        draftDirty: false,
      };
    case "SET_SECTIONS":
      return {
        ...state,
        editableSections: action.sections,
        draftDirty: action.markDirty ? true : state.draftDirty,
      };
    case "REMOVE_SECTION": {
      const nextSections = state.editableSections.filter((section) => section.id !== action.sectionId);
      const prefix = `${action.sectionId}:`;
      const nextPending = Object.keys(state.pendingByCell).reduce((acc, key) => {
        if (!key.startsWith(prefix)) {
          acc[key] = state.pendingByCell[key];
        }
        return acc;
      }, {} as Record<string, PendingEntry[]>);
      return {
        editableSections: nextSections,
        pendingByCell: nextPending,
        draftDirty: state.draftDirty,
      };
    }
    case "ADD_DELTA": {
      const { sectionId, rowId, monthIndex, delta } = action.payload;
      const key = buildCellKey(sectionId, rowId, monthIndex);
      const entry: PendingEntry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        sectionId,
        rowId,
        rowLabel: action.payload.rowLabel,
        monthIndex,
        monthLabel: action.payload.monthLabel,
        delta,
        createdAt: new Date().toISOString(),
      };
      const nextEntries = [entry, ...(state.pendingByCell[key] ?? [])].slice(0, 5);
      return {
        editableSections: applyDeltaToSections(state.editableSections, { sectionId, rowId, monthIndex }, delta),
        pendingByCell: { ...state.pendingByCell, [key]: nextEntries },
        draftDirty: true,
      };
    }
    case "UNDO_LAST_CELL": {
      const { sectionId, rowId, monthIndex } = action.payload;
      const key = buildCellKey(sectionId, rowId, monthIndex);
      const entries = state.pendingByCell[key] ?? [];
      if (!entries.length) return state;
      const [latest, ...rest] = entries;
      const nextPending = { ...state.pendingByCell };
      if (rest.length) {
        nextPending[key] = rest;
      } else {
        delete nextPending[key];
      }
      return {
        editableSections: applyDeltaToSections(state.editableSections, { sectionId, rowId, monthIndex }, -latest.delta),
        pendingByCell: nextPending,
        draftDirty: true,
      };
    }
    case "DRAFT_SAVED":
      if (!state.draftDirty) return state;
      return { ...state, draftDirty: false };
    default:
      return state;
  }
};

const toValuesArray = (monthOrder: MonthKey[], values: Record<MonthKey, number>) =>
  monthOrder.map((month) => values[month] ?? 0);

const BudgetSkeleton = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <PageBreadcrumbNav items={[{ label: "Transações" }, { label: "Orçamentos", href: "/transacoes/orcamento" }]} />
      <div className="flex justify-end gap-2 mb-4">
        <div className="h-10 w-40 bg-gray-200 animate-pulse rounded" />
      </div>
    </div>
    <div className="h-16 bg-gray-200/60 animate-pulse rounded-lg" />
    <Card className="shadow-sm">
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="h-6 w-20 bg-gray-200 animate-pulse rounded" />
          <div className="border rounded-md">
            <div className="h-12 bg-gray-100 animate-pulse" />
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
                  {Array.from({ length: 12 }).map((_, j) => (
                    <div key={j} className="h-4 w-16 bg-gray-200 animate-pulse rounded" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <div className="h-6 w-32 bg-gray-200 animate-pulse rounded" />
            <div className="border rounded-md">
              <div className="h-12 bg-gray-100 animate-pulse" />
              <div className="p-4 space-y-2">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="flex space-x-4">
                    <div className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
                    {Array.from({ length: 12 }).map((_, k) => (
                      <div key={k} className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

type BudgetErrorStateProps = {
  message: string;
  onRetry: () => void;
};

const BudgetErrorState = ({ message, onRetry }: BudgetErrorStateProps) => (
  <div className="flex justify-center items-center h-64">
    <div className="text-center">
      <div className="text-red-600 mb-2">Erro ao carregar orçamentos</div>
      <p className="text-gray-600">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Tentar novamente
      </button>
    </div>
  </div>
);

export default function BudgetPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentYear = currentDate.getFullYear();

  const {
    budgetOverview,
    loadingBudgetOverview: loading,
    error: overviewError,
    fetchBudgetOverview,
  } = useBudgetOverview(currentYear);

  const {
    budgetGroups,
    loadingCreateGroup,
    error: crudError,
    createBudgetGroup,
    fetchBudgetGroups,
    renameBudgetGroup,
    deleteBudgetGroup,
  } = useBudgetGroupsCrud();

  const blockingError = overviewError || crudError;
  const [draftState, dispatch] = useReducer(draftReducer, {
    editableSections: [],
    pendingByCell: {},
    draftDirty: false,
  });
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);
  const [pinSaldoCard, setPinSaldoCard] = useState(false);
  const [sectionPendingDeletion, setSectionPendingDeletion] = useState<EditableSectionState | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);
  const [addCategoryTarget, setAddCategoryTarget] = useState<{ id: string; title: string } | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const monthOrder = useMemo<MonthKey[]>(
    () => budgetOverview?.months ?? [],
    [budgetOverview?.months]
  );

  const monthLabels = useMemo(
    () => monthOrder.map((key: MonthKey) => MONTH_LABELS_MAP[key] ?? key),
    [monthOrder]
  );

  const computedSection = budgetOverview?.sectionsComputed;

  const serverEditableSections = useMemo<EditableSectionState[]>(() => {
    if (!budgetOverview) return [];
    return budgetOverview.sectionsEditable.map((section: SectionEditable) => ({
      id: section.id,
      title: section.title,
      color: section.color,
      footerLabel: section.footerLabel,
      isSystemDefault: section.isSystemDefault,
      rows: section.rows.map((row) => ({
        id: row.id,
        label: row.label,
        values: toValuesArray(monthOrder, row.values),
      })),
    }));
  }, [budgetOverview, monthOrder]);

  const buildDraftKey = useCallback((year: number) => {
    return `budget:draft:${year}`;
  }, []);

  const buildServerSyncKey = useCallback((year: number) => {
    return `budget:server-sync:${year}`;
  }, []);

  useEffect(() => {
    setDraftLoaded(false);
    dispatch({ type: "INIT_FROM_SERVER", sections: [] });
  }, [currentYear]);

  useEffect(() => {
    if (!budgetOverview || draftLoaded) return;

    const draftKey = buildDraftKey(currentYear);
    const serverSyncKey = buildServerSyncKey(currentYear);
    const lastServerSync = localStorage.getItem(serverSyncKey);
    let appliedDraft = false;

    try {
      const rawDraft = localStorage.getItem(draftKey);
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft);
        const draftUpdatedAt = parsed?.updatedAt ? new Date(parsed.updatedAt) : null;
        const serverSyncAt = lastServerSync ? new Date(lastServerSync) : null;
        const shouldPreferDraft = Boolean(
          draftUpdatedAt &&
            (!serverSyncAt || draftUpdatedAt.getTime() > serverSyncAt.getTime())
        );
        if (parsed?.year === currentYear && Array.isArray(parsed?.editableSections) && shouldPreferDraft) {
          dispatch({
            type: "INIT_FROM_DRAFT",
            sections: parsed.editableSections,
            pendingByCell: parsed.pendingByCell ?? {},
          });
          appliedDraft = true;
        }
      }
    } catch (error) {
      console.error("Erro ao carregar rascunho local do orçamento:", error);
    }

    if (!appliedDraft) {
      dispatch({ type: "INIT_FROM_SERVER", sections: serverEditableSections });
    }

    try {
      localStorage.setItem(serverSyncKey, new Date().toISOString());
    } catch (error) {
      console.error("Erro ao salvar sincronismo do orçamento:", error);
    }

    setDraftLoaded(true);
  }, [budgetOverview, currentYear, draftLoaded, serverEditableSections, buildDraftKey, buildServerSyncKey]);

  useEffect(() => {
    if (!draftLoaded || !budgetOverview) return;
    const draftKey = buildDraftKey(currentYear);
    const handle = window.setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            year: currentYear,
            editableSections: draftState.editableSections,
            pendingByCell: draftState.pendingByCell,
            updatedAt: new Date().toISOString(),
          })
        );
        dispatch({ type: "DRAFT_SAVED" });
      } catch (error) {
        console.error("Erro ao salvar rascunho local do orçamento:", error);
      }
    }, 1000);

    return () => window.clearTimeout(handle);
  }, [draftState.editableSections, draftState.pendingByCell, currentYear, draftLoaded, budgetOverview, buildDraftKey]);

  useEffect(() => {
    if (!draftState.draftDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [draftState.draftDirty]);

  const emptyValuesArray = useMemo(
    () => monthOrder.map(() => 0),
    [monthOrder]
  );

  const totalsBySectionTitle = useMemo(() => {
    const length = monthOrder.length;
    return draftState.editableSections.reduce((acc, section) => {
      const totals = Array.from({ length }, (_, idx) =>
        section.rows.reduce((sum, row) => sum + (row.values[idx] || 0), 0)
      );
      acc[section.title] = totals;
      return acc;
    }, {} as Partial<Record<SectionEditable["title"], number[]>>);
  }, [draftState.editableSections, monthOrder]);

  const computedRows = useMemo(
    () =>
      (computedSection?.rows ?? []).map((row) => ({
        id: row.id,
        label: row.label,
        values: totalsBySectionTitle[row.refSectionTitle] ?? emptyValuesArray,
      })),
    [computedSection, totalsBySectionTitle, emptyValuesArray]
  );

  const saldoValues = useMemo(() => {
    if (!computedRows.length) {
      return emptyValuesArray;
    }

    return monthOrder.map((_, monthIdx) =>
      computedRows.reduce(
        (acc, row, rowIndex) =>
          rowIndex === 0 ? (row.values[monthIdx] ?? 0) : acc - (row.values[monthIdx] || 0),
        0
      )
    );
  }, [computedRows, monthOrder, emptyValuesArray]);

  const handleAddDelta = useCallback((payload: {
    sectionId: string;
    rowId: string;
    rowLabel: string;
    monthIndex: number;
    monthLabel: string;
    delta: number;
  }) => {
    dispatch({ type: "ADD_DELTA", payload });
  }, []);

  const handleUndoLastCell = useCallback((payload: {
    sectionId: string;
    rowId: string;
    monthIndex: number;
  }) => {
    dispatch({ type: "UNDO_LAST_CELL", payload });
  }, []);

  const isCellPending = useCallback((sectionId: string, rowId: string, monthIndex: number) => {
    const key = buildCellKey(sectionId, rowId, monthIndex);
    return (draftState.pendingByCell[key]?.length ?? 0) > 0;
  }, [draftState.pendingByCell]);

  const getPendingEntries = useCallback((sectionId: string, rowId: string, monthIndex: number) => {
    const key = buildCellKey(sectionId, rowId, monthIndex);
    return draftState.pendingByCell[key] ?? [];
  }, [draftState.pendingByCell]);

  const hasPendingChanges = useCallback((sectionId: string) => {
    const prefix = `${sectionId}:`;
    return Object.keys(draftState.pendingByCell).some((key) => key.startsWith(prefix));
  }, [draftState.pendingByCell]);

  const handleMonthYearChange = useCallback((nextDate: Date) => {
    setCurrentDate(nextDate);
  }, []);

  const refreshCurrentBudgetOverview = useCallback(() => {
    return fetchBudgetOverview(currentYear);
  }, [fetchBudgetOverview, currentYear]);

  const cancelEditingSection = useCallback(() => {
    setEditingSectionId(null);
    setEditingTitleValue("");
    setSavingTitle(false);
  }, []);

  useEffect(() => {
    if (editingSectionId && !draftState.editableSections.some((section) => section.id === editingSectionId)) {
      cancelEditingSection();
    }
  }, [draftState.editableSections, editingSectionId, cancelEditingSection]);

  const handleDeleteSection = useCallback(async (section: EditableSectionState) => {
    if (section.isSystemDefault) {
      toast.error("Não é possível excluir um grupo padrão.");
      return;
    }

    if (deletingSectionId) {
      toast.info("Aguarde a exclusão em andamento.");
      return;
    }

    try {
      setDeletingSectionId(section.id);
      await deleteBudgetGroup(section.id);
      dispatch({ type: "REMOVE_SECTION", sectionId: section.id });
      toast.success("Grupo excluído com sucesso!");
      refreshCurrentBudgetOverview();
    } catch (error) {
      console.error("Erro ao excluir grupo:", error);
      toast.error("Não foi possível excluir o grupo.");
    } finally {
      setDeletingSectionId((current) => (current === section.id ? null : current));
    }
  }, [deleteBudgetGroup, refreshCurrentBudgetOverview, deletingSectionId]);

  const handleConfirmDelete = useCallback(async (section: EditableSectionState) => {
    await handleDeleteSection(section);
    setDeleteDialogOpen(false);
    setSectionPendingDeletion(null);
  }, [handleDeleteSection]);

  const handleSectionAction = useCallback((section: EditableSectionState, action: "edit" | "delete" | "addCategory") => {
    if (action === "edit") {
      setEditingSectionId(section.id);
      setEditingTitleValue(section.title);
      return;
    }

    if (action === "delete") {
      setSectionPendingDeletion(section);
      setDeleteDialogOpen(true);
      return;
    }

    setAddCategoryTarget({ id: section.id, title: section.title });
    setAddCategoryDialogOpen(true);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setSectionPendingDeletion(null);
    }
  }, []);

  const handleAddCategoryDialogOpenChange = useCallback((open: boolean) => {
    setAddCategoryDialogOpen(open);
    if (!open) {
      setAddCategoryTarget(null);
    }
  }, []);

  const saveSectionTitle = useCallback(async () => {
    if (!editingSectionId) return;
    const trimmedTitle = editingTitleValue.trim();
    if (!trimmedTitle) {
      toast.error("Informe um nome válido para o grupo.");
      return;
    }

    try {
      setSavingTitle(true);
      await renameBudgetGroup(editingSectionId, trimmedTitle);
      dispatch({
        type: "SET_SECTIONS",
        sections: draftState.editableSections.map((section) =>
          section.id === editingSectionId
            ? { ...section, title: trimmedTitle }
            : section
        ),
      });
      toast.success("Grupo atualizado com sucesso!");
      cancelEditingSection();
      refreshCurrentBudgetOverview();
    } catch (error) {
      console.error("Erro ao renomear grupo:", error);
      toast.error("Não foi possível renomear o grupo.");
    } finally {
      setSavingTitle(false);
    }
  }, [
    editingSectionId,
    editingTitleValue,
    renameBudgetGroup,
    cancelEditingSection,
    refreshCurrentBudgetOverview,
    draftState.editableSections,
  ]);

  const isRefreshing = loading && Boolean(budgetOverview);

  if (blockingError && !loading) {
    return <BudgetErrorState message={blockingError} onRetry={() => fetchBudgetOverview(currentYear)} />;
  }

  if (loading || !budgetOverview) {
    return <BudgetSkeleton />;
  }

  return (
    <>
      <div className="w-full flex flex-col gap-3 sm:grid sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4">
        <PageBreadcrumbNav
          items={[{ label: "Transações" }, { label: "Orçamentos", href: "/transacoes/orcamento" }]}
        />
        <div className="flex justify-center w-full">
          <MonthYearPicker
            date={currentDate}
            onChange={handleMonthYearChange}
            mode="year"
            className="w-full max-w-xs sm:w-auto [&>div]:py-0"
          />
        </div>
        <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
          {isRefreshing && (
            <div className="flex w-full items-center text-xs text-muted-foreground gap-2 sm:w-auto sm:justify-end">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              <span>Atualizando dados...</span>
            </div>
          )}
          <div className="flex w-full flex-row flex-wrap justify-center gap-2 sm:w-auto sm:flex-row sm:flex-nowrap sm:items-center sm:gap-2">
            <div className="w-auto">
              <CreateGroupDialog 
                createBudgetGroup={createBudgetGroup}
                loading={loadingCreateGroup}
                onGroupCreated={refreshCurrentBudgetOverview}
              />
            </div>
            <div className="w-auto">
              <ManageGroupsSheet
                labelButton="Organizar Grupos"
                budgetGroups={budgetGroups}
                onRefreshBudgetGroups={fetchBudgetGroups}
                onGroupsChanged={refreshCurrentBudgetOverview}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 w-full space-y-4">
        <Card
          className={cn(
            "shadow-sm w-full overflow-hidden transition-all duration-300",
            pinSaldoCard
              ? "sticky top-20 z-30 border-primary/40 shadow-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:backdrop-blur"
              : ""
          )}
        >
          <CardContent className="space-y-4 px-3 sm:px-6">
            <ReadOnlyBlock
              title="SALDO"
              color={computedSection?.color}
              months={monthLabels}
              rows={computedRows}
              footer={
                computedSection?.footerLabel
                  ? { label: computedSection.footerLabel, values: saldoValues }
                  : undefined
              }
              locale={budgetOverview.locale}
              currency={budgetOverview.currency}
              titleAction={
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={pinSaldoCard ? "Desfixar cartão do saldo" : "Fixar cartão do saldo"}
                  aria-pressed={pinSaldoCard}
                  onClick={() => setPinSaldoCard((prev) => !prev)}
                  className={cn(
                    "h-8 w-8 text-muted-foreground",
                    pinSaldoCard && "text-primary"
                  )}
                >
                  {pinSaldoCard ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                </Button>
              }
            />
            </CardContent>
          </Card>
          {draftState.editableSections.map((section) => (
          <Card key={section.id} className="shadow-sm w-full overflow-hidden">
            <CardContent className="space-y-6 px-3 sm:px-6">
              <EditableBlock
                sectionId={section.id}
                title={section.title}
                color={section.color}
                months={monthLabels}
                rows={section.rows}
                footerLabel={section.footerLabel}
                footerValues={totalsBySectionTitle[section.title] ?? emptyValuesArray}
                locale={budgetOverview.locale}
                currency={budgetOverview.currency}
                onEdit={() => handleSectionAction(section, "edit")}
                onDelete={() => handleSectionAction(section, "delete")}
                onAddCategory={() => handleSectionAction(section, "addCategory")}
                isSystemDefault={section.isSystemDefault}
                editingTitle={editingSectionId === section.id}
                titleInputValue={editingSectionId === section.id ? editingTitleValue : undefined}
                onTitleInputChange={(value) => setEditingTitleValue(value)}
                onTitleSave={saveSectionTitle}
                onTitleCancel={cancelEditingSection}
                savingTitle={savingTitle && editingSectionId === section.id}
                hasPendingChanges={hasPendingChanges(section.id)}
                isCellPending={isCellPending}
                getPendingEntries={getPendingEntries}
                onAddDelta={handleAddDelta}
                onUndoLastDelta={handleUndoLastCell}
              />
              </CardContent>
          </Card>
          ))}
      </div>
      <AddCategoryDialog
        open={addCategoryDialogOpen}
        targetSection={addCategoryTarget}
        onOpenChange={handleAddCategoryDialogOpenChange}
        onSuccess={async () => {
          await Promise.all([fetchBudgetGroups(), refreshCurrentBudgetOverview()]);
        }}
      />
      <DeleteGroupDialog
        open={deleteDialogOpen}
        section={sectionPendingDeletion}
        onOpenChange={handleDialogOpenChange}
        onConfirm={handleConfirmDelete}
        loading={Boolean(deletingSectionId)}
      />
    </>
  );
}
