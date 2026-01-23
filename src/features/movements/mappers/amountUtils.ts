export const formatAmountString = (amount: number): string =>
  Math.abs(amount).toFixed(2);

export const calculateInstallmentAmount = (
  totalAmount: number,
  installmentsCount: number
): number | null => {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return null;
  if (!Number.isFinite(installmentsCount) || installmentsCount <= 0) return null;
  return Math.round((totalAmount / installmentsCount) * 100) / 100;
};
