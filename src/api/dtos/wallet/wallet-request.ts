export interface WalletRequest {
  name: string;
  description?: string;
  walletType?: string;
  financialType: "ACCOUNT" | "CREDIT_CARD";
  balance?: number;
  bankId?: string | null;
  dueDay?: number | null;
  closingDay?: number | null;
  paymentAccountWalletId?: string | null;
}
