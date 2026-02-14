export function formatCurrency(value: number, locale?: string, currency?: string): string {
  return new Intl.NumberFormat(locale || "pt-BR", { style: "currency", currency: currency || "BRL" }).format(value || 0);
}

export function maskCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const numberValue = parseFloat(digits) / 100;
  return new Intl.NumberFormat("pt-BR", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(numberValue);
}

export function parseCurrencyInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  if (!digits) return Number.NaN;
  return Number(digits) / 100;
}
