import React, { useCallback, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Save } from "lucide-react";
import { TransactionResponse } from "@/api/dtos/transaction/transactionResponse";
import { getAmountDisplay } from "@/utils/transaction-utils";
import { WalletResponse } from "@/api/dtos/wallet/wallet-response";
import { CategoryResponse } from "@/api/dtos/category/category-response";
import { Button } from "@/components/ui/button";
import { useTransactions } from "@/pages/transactions/hooks/use-transactions";
import { TransactionRequest } from "@/api/dtos/transaction/transactionRequest";
import { toast } from "sonner";

interface TransactionCardProps {
  transaction: TransactionResponse;
  wallets: WalletResponse[];
  categories: CategoryResponse[];
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, index: number) => void;
  handleSelectChange: (name: string, value: string, index: number) => void;
  index: number;
  onTransactionSaved?: (fitId: string) => void;
  isSaved?: boolean;
  isSaving?: boolean;
}

const TransactionCard = React.memo(({ 
  transaction, 
  handleInputChange, 
  handleSelectChange,
  index, 
  wallets, 
  categories,
  onTransactionSaved,
  isSaved = false,
  isSaving = false
}: TransactionCardProps) => {
  const { createTransaction } = useTransactions();
  const [isExiting, setIsExiting] = useState(false);

  const onChangeHandler = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange(e, index);
  }, [handleInputChange, index]);

  const handleSave = async (transaction: TransactionResponse) => {
    try {
      const amountValue = Number(transaction.amount);
      const transactionRequest: TransactionRequest = {
        depositedDate: transaction.depositedDate,
        description: transaction.description,
        walletId: transaction.wallet?.id!,
        categoryId: transaction.category?.id!,
        amount: amountValue,
        transactionType: amountValue < 0
            ? "EXPENSE"
            : "INCOME",
      };

      await createTransaction(transactionRequest);
      setIsExiting(true);
      setTimeout(() => {
        onTransactionSaved?.(transaction.fitId);
      }, 300); // Tempo da animação
      toast.success("Transação salva com sucesso");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar transação");
    }
  }

  const isDuplicate = transaction.isFitIdAlreadyExists;

  const { text: amountText, className: amountClass } = getAmountDisplay(
    Number(transaction.amount),
    transaction.transactionType
  );
  const amountTextColor = isDuplicate ? `${amountClass} opacity-70` : amountClass;

  return (
    <Card
      className={`p-4 transition-all duration-500 ease-in-out
        ${isExiting ? "opacity-0 translate-x-full scale-95" : "opacity-100 translate-x-0 scale-100"} 
        ${isSaved ? "bg-green-50 border-green-200 shadow-lg" : ""}
        ${transaction.isFitIdAlreadyExists ? "bg-muted border-muted-foreground/20" : "hover:shadow-md"}`}
    >
      {isSaved && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-green-500 text-white rounded-full p-1 animate-pulse">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 group w-full">
              <Input
                type="text"
                name="description"
                value={transaction.description}
                disabled={transaction.isFitIdAlreadyExists || isSaving}
                onChange={onChangeHandler}
                className={`font-medium ${
                  transaction.isFitIdAlreadyExists ? "bg-transparent border-none p-0 text-muted-foreground" : ""
                }`}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{new Date(transaction.depositedDate).toLocaleDateString("pt-BR")}</span>
            <span>•</span>
            <span>{transaction.bankName}</span>
            {transaction.isRecurring && (
              <>
                <span>•</span>
                <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full text-xs">
                  Fixo
                </span>
              </>
            )}
            {transaction.isInstallment && (
              <>
                <span>•</span>
                <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full text-xs">
                  Parcelado
                </span>
              </>
            )}
          </div>
        </div>
        <p className={`text-lg font-semibold whitespace-nowrap ${amountTextColor}`}>
          {amountText}
        </p>
      </div>

      <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] items-end gap-4">
        {/* Wallet Select */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Carteira
          </label>
          <Select 
            value={transaction.wallet?.id || undefined}
            onValueChange={(value) => handleSelectChange('wallet', value, index)}
            disabled={transaction.isFitIdAlreadyExists || isSaving}
          >
            <SelectTrigger className={transaction.isFitIdAlreadyExists ? "bg-transparent border-none" : ""}>
              <SelectValue placeholder="Escolha uma carteira">
                {transaction.wallet?.name || "Escolha uma carteira"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {wallets.length === 0 ? (
                <SelectItem value="empty" disabled>Nenhuma carteira disponível</SelectItem>
              ) : (
                wallets.filter(wallet => wallet.id).map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id as string}>
                    {wallet.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Category Select */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Categoria
          </label>
          <Select 
            value={transaction.category?.id || undefined}
            onValueChange={(value) => handleSelectChange('category', value, index)}
            disabled={transaction.isFitIdAlreadyExists || isSaving}
          >
            <SelectTrigger className={transaction.isFitIdAlreadyExists ? "bg-transparent border-none" : ""}>
              <SelectValue placeholder="Escolha uma categoria">
                {transaction.category?.name || "Escolha uma categoria"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categories.length === 0 ? (
                <SelectItem value="empty" disabled>Nenhuma categoria disponível</SelectItem>
              ) : (
                categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Botão de salvar */}
        <Button 
          variant="outline" 
          onClick={() => handleSave(transaction)}
          disabled={transaction.isFitIdAlreadyExists || isSaving}
          className={isSaving ? "opacity-50" : ""}
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      </div>

      {transaction.isFitIdAlreadyExists && (
        <div className="flex items-center gap-2 text-primary bg-primary/10 px-3 py-1.5 rounded-md text-sm font-medium w-full">
          <CheckCircle2 className="h-4 w-4" />
          Transação já processada
        </div>
      )}
    </Card>
  );
});

export default TransactionCard;
