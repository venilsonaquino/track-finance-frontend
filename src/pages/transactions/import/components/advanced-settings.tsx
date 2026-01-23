import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Repeat, CreditCard, ChevronDown } from "lucide-react";
import { TransactionResponse } from "@/api/dtos/transaction/transactionResponse";

interface AdvancedSettingsProps {
  transaction: TransactionResponse;
  errors: { [key: string]: string };
  onRecurringChange: (fitId: string, isRecurring: boolean) => void;
  onInstallmentChange: (fitId: string, isInstallment: boolean) => void;
  onInstallmentTotalChange: (fitId: string, total: string) => void;
  onRecurringIntervalChange: (
    fitId: string,
    installmentInterval: "DAILY" | "MONTHLY" | "WEEKLY" | "YEARLY" | null
  ) => void;
}

export const AdvancedSettings = ({
  transaction,
  errors,
  onRecurringChange,
  onInstallmentChange,
  onInstallmentTotalChange,
  onRecurringIntervalChange,
}: AdvancedSettingsProps) => {
  return (
    <div className="border-t pt-3">
      <Collapsible>
        <div className="flex justify-end items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Configurações Avançadas</span>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="space-y-4 mt-4">
          {/* Controles de Transação Fixa */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Transação Fixa</span>
              </div>
              <Switch
                checked={!!transaction.isRecurring}
                onCheckedChange={(checked) =>
                  onRecurringChange(transaction.fitId, checked)
                }
                disabled={!!transaction.isInstallment}
              />
            </div>
          </div>

          {/* Controles de Parcelamento */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Transação Parcelada</span>
              </div>
              <Switch
                checked={!!transaction.isInstallment}
                onCheckedChange={(checked) =>
                  onInstallmentChange(transaction.fitId, checked)
                }
                disabled={!!transaction.isRecurring}
              />
            </div>

            {transaction.isInstallment && (
              <div className="space-y-2 pl-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">
                      Total de Parcelas
                    </label>
                    <Input
                      type="number"
                      min="2"
                      max="48"
                      placeholder="Ex: 12"
                      value={transaction.installmentNumber || ""}
                      onChange={(e) =>
                        onInstallmentTotalChange(transaction.fitId, e.target.value)
                      }
                      className={errors?.installmentTotal ? "border-destructive" : ""}
                    />
                    {errors?.installmentTotal && (
                      <span className="text-xs text-destructive mt-1">
                        {errors.installmentTotal}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">
                      Intervalo
                    </label>
                    <Select
                      value={transaction.recurringInterval || ""}
                      onValueChange={(value: "DAILY" | "MONTHLY" | "WEEKLY" | "YEARLY") =>
                        onRecurringIntervalChange(transaction.fitId, value)
                      }
                    >
                      <SelectTrigger
                        className={errors?.recurringInterval ? "border-destructive" : ""}
                      >
                        <SelectValue placeholder="Selecione o intervalo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAILY">Diário</SelectItem>
                        <SelectItem value="WEEKLY">Semanal</SelectItem>
                        <SelectItem value="MONTHLY">Mensal</SelectItem>
                        <SelectItem value="YEARLY">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors?.recurringInterval && (
                      <span className="text-xs text-destructive mt-1">
                        {errors.recurringInterval}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}; 