import { useState } from "react";
import PageBreadcrumbNav from "@/components/BreadcrumbNav";
import { WalletDialog } from "@/pages/wallet/components/wallet-dialog";
import { WalletCard } from "@/pages/wallet/components/wallet-card";
import { useWallets } from "./hooks/use-wallets";
import { WalletRequest } from "@/api/dtos/wallet/wallet-request";
import { toast } from "sonner";
import { WalletResponse } from "@/api/dtos/wallet/wallet-response";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Button } from "@/components/ui/button";

const createEmptyFormData = (): Partial<WalletResponse> => ({
  name: "",
  description: "",
  financialType: "ACCOUNT",
  balance: 0,
  bankId: null,
  dueDay: null,
  closingDay: null,
  paymentAccountWalletId: null,
});

const Wallet = () => {
  const { wallets, loading, error, createWallet, updateWallet, deleteWallet } = useWallets();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<string | null>(null);
  const [editingWallet, setEditingWallet] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<WalletResponse>>(createEmptyFormData());

  const handleSubmit = async (data: WalletRequest) => {
    try {
      if (editingWallet) {
        await updateWallet(editingWallet, data);
        toast.success("Carteira atualizada com sucesso!");
      } else {
        await createWallet(data);
        toast.success("Carteira criada com sucesso!");
      }

      setIsDialogOpen(false);
      setFormData(createEmptyFormData());
      setEditingWallet(null);
    } catch {
      toast.error("Erro ao salvar carteira");
    }
  };

  const handleEdit = (walletId: string) => {
    const wallet = wallets.find((item) => item.id === walletId);
    if (!wallet) return;

    setEditingWallet(walletId);
    setFormData(wallet);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setWalletToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setFormData(createEmptyFormData());
      setEditingWallet(null);
    }

    setIsDialogOpen(open);
  };

  const confirmDelete = async () => {
    if (!walletToDelete) return;

    try {
      await deleteWallet(walletToDelete);
      toast.success("Carteira excluída com sucesso!");
    } catch {
      toast.error("Erro ao excluir carteira");
    } finally {
      setIsDeleteDialogOpen(false);
      setWalletToDelete(null);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4">Carregando...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">Erro: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center">
        <PageBreadcrumbNav items={[{ label: "Carteiras" }]} />
        <Button onClick={() => setIsDialogOpen(true)}>Nova Carteira</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {wallets.map((wallet) => (
          <WalletCard
            key={wallet.id}
            wallet={wallet}
            onEdit={() => handleEdit(wallet.id!)}
            onDelete={() => handleDelete(wallet.id!)}
          />
        ))}
      </div>

      <WalletDialog
        open={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        formData={formData}
        wallets={wallets}
        onSubmit={handleSubmit}
        isEditing={!!editingWallet}
      />

      <ConfirmDelete
        isDeleteDialogOpen={isDeleteDialogOpen}
        setIsDeleteDialogOpen={setIsDeleteDialogOpen}
        confirmDelete={confirmDelete}
      />
    </div>
  );
};

export default Wallet;
