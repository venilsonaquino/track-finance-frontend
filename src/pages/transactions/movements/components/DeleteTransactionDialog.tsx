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

type DeleteTransactionDialogProps = {
	open: boolean;
	transaction: TransactionResponse | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	loading?: boolean;
};

export const DeleteTransactionDialog = ({
	open,
	transaction,
	onOpenChange,
	onConfirm,
	loading = false,
}: DeleteTransactionDialogProps) => {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Excluir movimentação</DialogTitle>
					<DialogDescription>
						Tem certeza que deseja excluir{" "}
						<strong>{transaction?.description || "esta movimentação"}</strong>? Essa ação não
						pode ser desfeita.
					</DialogDescription>
				</DialogHeader>

				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
						Cancelar
					</Button>
					<Button variant="destructive" onClick={onConfirm} disabled={loading || !transaction?.id}>
						{loading ? "Excluindo..." : "Excluir"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
