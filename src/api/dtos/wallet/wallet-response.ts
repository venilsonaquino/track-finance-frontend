export interface WalletResponse {
  id?: string;
  name: string;
  description: string;
  walletType: string | null;
  financialType: "ACCOUNT" | "CREDIT_CARD";
  balance: number;
  bankId?: string | null;
  dueDay?: number | null;
  closingDay?: number | null;
  paymentAccountWalletId?: string | null;
  userId: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}
