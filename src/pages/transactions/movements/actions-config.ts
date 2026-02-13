import { LucideIcon } from "lucide-react";
import { CalendarClock, CheckCircle2, Clock, Edit, Eye, Trash2, Undo2, Wallet } from "lucide-react";
import { TransactionResponse } from "@/api/dtos/transaction/transactionResponse";

export type MovementRowActions = {
  canMarkAsPaid: boolean;
  canReverse: boolean;
  canEditDueDate: boolean;
  canAdjustAmount: boolean;
  canSkip: boolean;
  canViewContract: boolean;
};

type ActionHandlers = {
  onEdit: (transaction: TransactionResponse) => void;
  onReverse: (transaction: TransactionResponse) => void;
  onMarkAsPaid: (transaction: TransactionResponse) => void;
  onEditDueDate: (transaction: TransactionResponse) => void;
  onAdjustAmount: (transaction: TransactionResponse) => void;
  onSkip: (transaction: TransactionResponse) => void;
  onViewContract: (transaction: TransactionResponse) => void;
  onDelete: (transaction: TransactionResponse) => void;
};

export type MovementMenuAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  visible: boolean;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
};

type BuildMenuActionsInput = {
  transaction: TransactionResponse;
  actions: MovementRowActions;
  canUseSimplePaidActions: boolean;
  canUseOccurrenceActions: boolean;
  canUseViewContractAction: boolean;
  isReversed: boolean;
  isMarkingAsPaid: boolean;
  handlers: ActionHandlers;
};

export const buildMovementMenuActions = ({
  transaction,
  actions,
  canUseSimplePaidActions,
  canUseOccurrenceActions,
  canUseViewContractAction,
  isReversed,
  isMarkingAsPaid,
  handlers,
}: BuildMenuActionsInput): MovementMenuAction[] => {
  return [
    {
      id: "edit",
      label: "Editar",
      icon: Edit,
      visible: canUseSimplePaidActions,
      onClick: () => handlers.onEdit(transaction),
    },
    {
      id: "reverse",
      label: "Estornar",
      icon: Undo2,
      visible: actions.canReverse,
      disabled: isReversed,
      onClick: () => handlers.onReverse(transaction),
    },
    {
      id: "mark-as-paid",
      label: isMarkingAsPaid ? "Marcando..." : "Marcar como pago",
      icon: CheckCircle2,
      visible: actions.canMarkAsPaid,
      disabled: isMarkingAsPaid,
      onClick: () => handlers.onMarkAsPaid(transaction),
    },
    {
      id: "edit-due-date",
      label: "Editar vencimento",
      icon: CalendarClock,
      visible: actions.canEditDueDate,
      onClick: () => handlers.onEditDueDate(transaction),
    },
    {
      id: "adjust-amount",
      label: "Ajustar valor",
      icon: Wallet,
      visible: actions.canAdjustAmount,
      onClick: () => handlers.onAdjustAmount(transaction),
    },
    {
      id: "skip-month",
      label: "Ignorar este mês",
      icon: Clock,
      visible: actions.canSkip,
      onClick: () => handlers.onSkip(transaction),
    },
    {
      id: "view-contract",
      label: "Ver contrato",
      icon: Eye,
      visible: canUseViewContractAction,
      onClick: () => handlers.onViewContract(transaction),
    },
    {
      id: "delete",
      label: "Excluir",
      icon: Trash2,
      visible: !canUseOccurrenceActions,
      className: "text-red-600",
      onClick: () => handlers.onDelete(transaction),
    },
  ];
};
