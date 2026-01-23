export const formatAmountString = (amount: number): string =>
  Math.abs(amount).toFixed(2);

type InstallmentBreakdown = {
  baseAmount: number;
  remainder: number;
  amounts: number[];
};

const getInstallmentBreakdown = (
  totalAmount: number,
  installmentsCount: number
): InstallmentBreakdown | null => {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return null;
  if (!Number.isFinite(installmentsCount) || installmentsCount <= 0) return null;

  const totalInCents = Math.round(totalAmount * 100);
  const baseInCents = Math.floor(totalInCents / installmentsCount);
  const remainder = totalInCents % installmentsCount;

  const amounts = Array.from({ length: installmentsCount }, (_, index) => {
    const cents = baseInCents + (index < remainder ? 1 : 0);
    return cents / 100;
  });

  return {
    baseAmount: baseInCents / 100,
    remainder,
    amounts,
  };
};

export const calculateInstallmentAmount = (
  totalAmount: number,
  installmentsCount: number
): number | null => {
  const breakdown = getInstallmentBreakdown(totalAmount, installmentsCount);
  return breakdown ? breakdown.baseAmount : null;
};

export const calculateInstallmentSchedule = (
  totalAmount: number,
  installmentsCount: number
): InstallmentBreakdown | null => getInstallmentBreakdown(totalAmount, installmentsCount);
