import { IntervalType } from "@/types/Interval-type ";

export type MovementKind = "single" | "recurring" | "installment";

export type MovementInput = {
  description: string;
  amount: number;
  depositedDate: string;
  walletId: string;
  categoryId: string;
  affectBalance: boolean;
  installmentInterval: IntervalType;
  installmentsCount?: number | null;
};

export type CreateMovementInput = MovementInput & {
  kind: MovementKind;
};

export type CreateMovementResult = {
  id: string;
  kind: MovementKind;
};
