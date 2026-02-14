import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TransactionResponse } from "@/api/dtos/transaction/transactionResponse";

type ReverseTransactionDialogProps = {
	open: boolean;
	transaction: TransactionResponse | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	loading?: boolean;
};

export const ReverseTransactionDialog = ({
	open,
	transaction,
	onOpenChange,
	onConfirm,
	loading = false,
}: ReverseTransactionDialogProps) => {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Estornar movimentação</DialogTitle>
					<DialogDescription>
						Tem certeza que deseja estornar transação? Essa ação não pode ser desfeita.
					</DialogDescription>
				</DialogHeader>

				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
						Cancelar
					</Button>
					<Button variant="destructive" onClick={onConfirm} disabled={loading || !transaction?.id}>
						{loading ? "Estornando..." : "Estornar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
