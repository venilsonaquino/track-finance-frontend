import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WalletRequest } from "@/api/dtos/wallet/wallet-request";
import { WalletForm } from "./wallet-form";
import { WalletResponse } from "@/api/dtos/wallet/wallet-response";

interface WalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: Partial<WalletResponse>;
  wallets: WalletResponse[];
  onSubmit: (data: WalletRequest) => void;
  isEditing: boolean;
}

export function WalletDialog({
  open,
  onOpenChange,
  formData,
  wallets,
  onSubmit,
  isEditing,
}: WalletDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Carteira" : "Nova Carteira"}</DialogTitle>
        </DialogHeader>
        <WalletForm
          initialData={formData as WalletRequest}
          wallets={wallets}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isEditing={isEditing}
        />
      </DialogContent>
    </Dialog>
  );
} 
