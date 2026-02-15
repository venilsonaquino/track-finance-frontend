import { TransactionRequest } from "@/api/dtos/transaction/transactionRequest";
import { TransactionResponse } from "@/api/dtos/transaction/transactionResponse";
import { TransactionService } from "@/api/services/transactionService";
import { useState, useCallback } from "react";

export const useTransactions = () => {
	const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBatchTransactions = useCallback(async (transactions: TransactionRequest[]) => {
    try {
      setLoading(true);
      const response = await TransactionService.batchCreateTransactions(transactions);
      setTransactions(response.data);
    } catch (error) {
      setError(error as string);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const createTransaction = useCallback(async (transaction: TransactionRequest) => {
    try {
      setLoading(true);
      const response = await TransactionService.createTransaction(transaction);
      setTransactions(response.data);
    } catch (error) {
      setError(error as string);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearTransactions = useCallback(() => {
    setTransactions([]);
  }, []);

  const updateTransaction = useCallback(async (transaction: TransactionRequest) => {
    try {
      setLoading(true);
      const response = await TransactionService.updateTransaction(transaction.id!, transaction);
      setTransactions(response.data);
    } catch (error) {
      setError(error as string);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const reverseTransaction = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const response = await TransactionService.reverseTransaction(id);
      if (Array.isArray(response?.data)) {
        setTransactions(response.data);
      }
      return response.data;
    } catch (error) {
      setError(error as string);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      setLoading(true);
      await TransactionService.deleteTransaction(id);
    } catch (error) {
      setError(error as string);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTransactions = useCallback(async (startDate: string, endDate: string, view: "realized" | "future" | "all") => {
    try {
      setLoading(true);
      const response = await TransactionService.getTransactions(startDate, endDate, view);
      setTransactions(response.data);
      return response.data;
    } catch (error) {
      setError(error as string);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTransactionById = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const response = await TransactionService.getTransactionById(id);
      return response.data;
    } catch (error) {
      setError(error as string);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { 
    transactions, 
    loading, 
    error, 
    createBatchTransactions, 
    createTransaction, 
    clearTransactions, 
    updateTransaction, 
    reverseTransaction,
    deleteTransaction, 
    getTransactions,
    getTransactionById 
  };
};
