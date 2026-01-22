export type Row = {
  id: string;
  label: string;
  values: number[]; // 12 meses
};

export type PendingEntry = {
  id: string;
  sectionId: string;
  rowId: string;
  rowLabel: string;
  monthIndex: number;
  monthLabel: string;
  delta: number;
  createdAt: string;
};

export type EditableSectionState = {
  id: string;
  color?: string;
  title: SectionEditable["title"];
  footerLabel: string;
  rows: Row[];
  isSystemDefault?: boolean;
};

export type MonthKey =
  | "Jan" | "Fev" | "Mar" | "Abr" | "Mai" | "Jun"
  | "Jul" | "Ago" | "Set" | "Out" | "Nov" | "Dez";

export type ValuesByMonth = Record<MonthKey, number>; 

export type RowItem = {
  id: string;
  label: string;
  values: ValuesByMonth;
};

export type SectionEditable = {
  id: string;
  title: string;
  kind: "editable";
  position: number;
  color?: string;
  rows: RowItem[];
  isSystemDefault: boolean;
  footerLabel: string;
};

export type SectionComputed = {
  id: string;
  title: string;
  kind: "computed";
  position: number;
  color: string;
  isSystemDefault: boolean;       
  rows: Array<{
    id: string;
    label: string;
    refSectionTitle: SectionEditable["title"];
  }>;
  footerLabel: string;
};

export type BudgetPayloadResponse = {
  version: number;
  year: number;
  currency: string;
  locale: string;
  months: MonthKey[];

  sectionsEditable: SectionEditable[];
  sectionsComputed: SectionComputed;
};


export type Category = { id: string; name: string; color: string };
export type Group = { id: string; title: string; color: string; kind: string; footerLabel: string; categories: Category[] };
type AssignmentItem = {categoryId: string; budgetGroupId?: string | null;}
export type SyncCategoryAssignments = { assignments: AssignmentItem[] }

export type CategoryIdsByGroup = Record<string, string[]>;
