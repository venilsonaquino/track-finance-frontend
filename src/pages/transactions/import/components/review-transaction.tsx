import React, { useCallback, useMemo, useState } from "react";
import { TransactionResponse } from "@/api/dtos/transaction/transactionResponse";
import { ReviewHeader } from "./review-header";
import { useWallets } from "@/pages/wallet/hooks/use-wallets";
import { useCategories } from "@/pages/category/hooks/use-categories";
import TransactionCard from "./transaction-card";
import { useTransactions } from "@/pages/transactions/hooks/use-transactions";
import { TransactionRequest } from "@/api/dtos/transaction/transactionRequest";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ReviewTransactionProps {
	transactions: TransactionResponse[];
	onCancel: () => void;
	setImportedTransactions: React.Dispatch<React.SetStateAction<TransactionResponse[]>>;
}

export const ReviewTransaction = ({ transactions, onCancel, setImportedTransactions  }: ReviewTransactionProps) => {
	const navigate = useNavigate();
	const { wallets } = useWallets();
	const { categories } = useCategories();
	const { createBatchTransactions } = useTransactions();
	const [isSaving, setIsSaving] = useState(false);
	const [savedTransactions, setSavedTransactions] = useState<Set<string>>(new Set());

	const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, index: number) => {
		const { value } = e.target;
		setImportedTransactions((prev: TransactionResponse[]) => {
			const transaction = prev[index];
			if (transaction.description === value) return prev;
			
			const updated = [...prev];
			updated[index] = { ...transaction, description: value };
			return updated;
		});
	}, []);

	const handleSelectChange = useCallback((name: string, value: string, index: number) => {
		setImportedTransactions((prev: TransactionResponse[]) => {
			const updated = [...prev];
			const transaction = updated[index];

			if (name === 'wallet') {
				const selectedWallet = wallets.find(w => w.id === value);
				updated[index] = { ...transaction, wallet: selectedWallet || null };
			} else if (name === 'category') {
				const selectedCategory = categories.find(c => c.id === value);
				updated[index] = { ...transaction, category: selectedCategory || null };
			}

			return updated;
		});
	}, [wallets, categories]);

	const handleSaveAll = async () => {
		const hasIncompleteTransactions = transactions.some(
			(transaction) => !transaction.wallet?.id || !transaction.category?.id
		);
	
		if (hasIncompleteTransactions) {
			toast.error("Preencha todas as carteiras e categorias antes de salvar.");
			return;
		}

		setIsSaving(true);
	
		try {
			const transactionsToSave: TransactionRequest[] = transactions.map((transaction) => {
				const transferType = (transaction.transferType || "").toUpperCase();
				const amountValue = Number(transaction.amount);
				const payload: TransactionRequest = {
					depositedDate: transaction.depositedDate,
					description: transaction.description,
					walletId: transaction.wallet?.id!,
					categoryId: transaction.category?.id!,
					amount: amountValue,
					transactionType: transferType === "TRANSFER"
						? "TRANSFER"
						: amountValue < 0
							? "EXPENSE"
							: "INCOME",
				};
				return payload;
			});
		
			await createBatchTransactions(transactionsToSave);
			
			// Adicionar efeito visual para todas as transações salvas
			const allFitIds = transactions.map(t => t.fitId);
			setSavedTransactions(new Set(allFitIds));
			
			toast.success("Transações salvas com sucesso");
			
			// Aguardar um pouco para mostrar o efeito visual antes de redirecionar
			setTimeout(() => {
				navigate("/transacoes/lancamentos");
			}, 1500);
			
		} catch (error) {
			toast.error("Erro ao salvar transações");
		} finally {
			setIsSaving(false);
		}
	};

	const handleTransactionSaved = useCallback((fitId: string) => {
		setSavedTransactions(prev => new Set([...prev, fitId]));
		
		// Remover a transação após um delay para mostrar o efeito
		setTimeout(() => {
			setImportedTransactions(prev => prev.filter(transaction => transaction.fitId !== fitId));
		}, 800);
	}, []);

	const handleApplyWalletToAll = useCallback((walletId: string) => {
		const selectedWallet = wallets.find(w => w.id === walletId);
		if (!selectedWallet) return;

		setImportedTransactions(prev => prev.map(transaction => {
			if (transaction.isFitIdAlreadyExists) {
				return transaction;
			}
			
			return {
				...transaction,
				wallet: selectedWallet
			};
		}));

		toast.success("Carteira aplicada às novas transações sem carteira definida");
	}, [wallets]);

	const handleRemoveProcessed = useCallback(() => {
		setImportedTransactions(prev => {
			const filtered = prev.filter(transaction => !transaction.isFitIdAlreadyExists);
			if (prev.length === filtered.length) {
				toast.info("Não há transações processadas para remover");
				return prev;
			}
			toast.success("Transações já processadas foram removidas");
			return filtered;
		});
	}, []);

	const transactionsList = useMemo(() => (
		transactions.map((transaction, index) => (
			<TransactionCard
				key={transaction.fitId}
				transaction={transaction}
				wallets={wallets}
				categories={categories}
				handleInputChange={handleInputChange}
				handleSelectChange={handleSelectChange}
				index={index}
				onTransactionSaved={handleTransactionSaved}
				isSaved={savedTransactions.has(transaction.fitId)}
				isSaving={isSaving}
			/>
		))
	), [transactions, wallets, categories, handleInputChange, handleSelectChange, handleTransactionSaved, savedTransactions, isSaving]);

	return (
		<>
			<ReviewHeader 
				onCancel={onCancel} 
				onSaveAll={handleSaveAll} 
				wallets={wallets}
				onApplyWalletToAll={handleApplyWalletToAll}
				onRemoveProcessed={handleRemoveProcessed}
				isSaving={isSaving}
			/>
			<div className="container mx-auto py-8">
				<div className="grid gap-3">
					{transactionsList}
				</div>
			</div>
		</>
	);
};
