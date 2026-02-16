import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { WalletResponse } from "@/api/dtos/wallet/wallet-response";
import { WalletRequest } from "@/api/dtos/wallet/wallet-request";
import { useEffect, useMemo, useState } from "react";
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { BankSelector } from "@/components/bank-selector";

type WalletFinancialType = "ACCOUNT" | "CREDIT_CARD";

const schema = yup
  .object({
    financialType: yup
      .mixed<WalletFinancialType>()
      .oneOf(["ACCOUNT", "CREDIT_CARD"])
      .required("Tipo financeiro é obrigatório"),
    name: yup.string().trim().required("Nome é obrigatório"),
    description: yup.string().optional(),
    bankId: yup.string().nullable().optional(),
    balance: yup
      .number()
      .transform((value, originalValue) =>
        originalValue === "" || originalValue === null ? undefined : value,
      )
      .when("financialType", {
        is: "ACCOUNT",
        then: (balanceSchema) =>
          balanceSchema
            .min(0, "Saldo inicial não pode ser negativo")
            .notRequired(),
        otherwise: (balanceSchema) => balanceSchema.notRequired(),
      }),
    dueDay: yup
      .number()
      .transform((value, originalValue) =>
        originalValue === "" || originalValue === null ? undefined : value,
      )
      .when("financialType", {
        is: "CREDIT_CARD",
        then: (dueDaySchema) =>
          dueDaySchema
            .required("Dia de vencimento é obrigatório")
            .min(1)
            .max(31),
        otherwise: (dueDaySchema) => dueDaySchema.notRequired(),
      }),
    closingDay: yup
      .number()
      .transform((value, originalValue) =>
        originalValue === "" || originalValue === null ? undefined : value,
      )
      .when("financialType", {
        is: "CREDIT_CARD",
        then: (closingDaySchema) =>
          closingDaySchema
            .required("Dia de fechamento é obrigatório")
            .min(1)
            .max(31),
        otherwise: (closingDaySchema) => closingDaySchema.notRequired(),
      }),
    paymentAccountWalletId: yup.string().nullable().optional(),
  })
  .test(
    "closing-day-different-from-due-day",
    "Dia de fechamento não pode ser igual ao dia de vencimento",
    function validateClosingAndDue(values) {
      if (values.financialType !== "CREDIT_CARD") {
        return true;
      }

      if (!values.closingDay || !values.dueDay) {
        return true;
      }

      if (values.closingDay === values.dueDay) {
        return this.createError({
          path: "dueDay",
          message: "Dia de fechamento não pode ser igual ao dia de vencimento",
        });
      }

      return true;
    },
  );

interface WalletFormProps {
  initialData?: Partial<WalletResponse>;
  wallets: WalletResponse[];
  onSubmit: (data: WalletRequest) => void;
  onCancel?: () => void;
  isEditing?: boolean;
}

export const WalletForm = ({
  initialData,
  wallets,
  onSubmit,
  onCancel,
  isEditing = false,
}: WalletFormProps) => {
  const [step, setStep] = useState(1);

  const defaultValues = useMemo<WalletRequest>(
    () => ({
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      financialType: initialData?.financialType ?? "ACCOUNT",
      balance: Number(initialData?.balance ?? 0),
      bankId: initialData?.bankId ?? null,
      dueDay: initialData?.dueDay ?? undefined,
      closingDay: initialData?.closingDay ?? undefined,
      paymentAccountWalletId: initialData?.paymentAccountWalletId ?? null,
    }),
    [initialData],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<WalletRequest>({
    resolver: yupResolver(schema) as any,
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
    setStep(1);
  }, [defaultValues, reset]);

  const financialType = watch("financialType");
  const bankId = watch("bankId");
  const dueDay = watch("dueDay");
  const closingDay = watch("closingDay");
  const paymentAccountWalletId = watch("paymentAccountWalletId");

  const paymentAccountOptions = useMemo(
    () =>
      wallets.filter(
        (wallet) =>
          wallet.financialType === "ACCOUNT" && wallet.id !== initialData?.id,
      ),
    [wallets, initialData?.id],
  );

  const handleFormSubmit = (data: WalletRequest) => {
    const isCreditCard = data.financialType === "CREDIT_CARD";

    const payload: WalletRequest = {
      name: data.name.trim(),
      description: data.description?.trim() ?? "",
      financialType: data.financialType,
      bankId: data.bankId || null,
      balance: isCreditCard ? 0 : Number(data.balance ?? 0),
      dueDay: isCreditCard ? Number(data.dueDay) : null,
      closingDay: isCreditCard ? (data.closingDay ? Number(data.closingDay) : null) : null,
      paymentAccountWalletId: isCreditCard
        ? data.paymentAccountWalletId || null
        : null,
    };

    onSubmit(payload);
  };

  const financialTypeLabel =
    financialType === "CREDIT_CARD" ? "Cartão de crédito" : "Conta";

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Tipo financeiro</h3>
            <p className="text-sm text-muted-foreground">
              Defina se essa carteira será uma conta de saldo imediato ou um cartão de crédito.
            </p>
          </div>

          <div className="space-y-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  setValue("financialType", "ACCOUNT", { shouldValidate: true })
                }
                className={`rounded-md border p-4 text-left transition ${financialType === "ACCOUNT"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                  }`}
              >
                <p className="font-medium">Conta</p>
                <p className="text-sm text-muted-foreground">
                  Saldo imediato. Transações afetam o saldo na hora.
                </p>
              </button>
              <button
                type="button"
                onClick={() =>
                  setValue("financialType", "CREDIT_CARD", { shouldValidate: true })
                }
                className={`rounded-md border p-4 text-left transition ${financialType === "CREDIT_CARD"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                  }`}
              >
                <p className="font-medium">Cartão de crédito</p>
                <p className="text-sm text-muted-foreground">
                  Compras geram fatura. Possui dia de fechamento e vencimento.
                </p>
              </button>
            </div>
            {errors.financialType && (
              <p className="text-sm text-red-500">{errors.financialType.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="button" onClick={() => setStep(2)}>
              Continuar
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Dados da carteira</h3>
            <p className="text-sm text-muted-foreground">
              Tipo financeiro selecionado: <strong>{financialTypeLabel}</strong>
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="name">
              {financialType === "CREDIT_CARD" ? "Nome do cartão" : "Nome da carteira"}
            </label>
            <Input
              id="name"
              placeholder={
                financialType === "CREDIT_CARD"
                  ? "Ex: Nubank, Inter Mastercard"
                  : "Ex: MainWallet, Itaú, Dinheiro"
              }
              {...register("name")}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="description">Descrição (opcional)</label>
            <Textarea
              id="description"
              placeholder={
                financialType === "CREDIT_CARD"
                  ? "Ex: Cartão usado para despesas do dia a dia"
                  : "Ex: Conta principal do dia a dia"
              }
              {...register("description")}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="bank">Banco / emissor (opcional)</label>
            <BankSelector
              value={bankId ?? undefined}
              onValueChange={(value) => setValue("bankId", value || null)}
              placeholder="Selecione um banco"
            />
          </div>

          {financialType === "ACCOUNT" && (
            <div className="space-y-2">
              <label htmlFor="balance">Saldo inicial</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                id="balance"
                placeholder="Ex: 1.250,00"
                {...register("balance")}
              />
              <p className="text-xs text-muted-foreground">Você pode ajustar depois.</p>
              {errors.balance && (
                <p className="text-sm text-red-500">{errors.balance.message}</p>
              )}
            </div>
          )}

          {financialType === "CREDIT_CARD" && (
            <>
              <div className="space-y-2">
                <label htmlFor="closingDay">Dia de fechamento</label>
                <Input
                  id="closingDay"
                  type="number"
                  min={1}
                  max={31}
                  step={1}
                  placeholder="1 a 31"
                  value={closingDay ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setValue("closingDay", value ? Number(value) : undefined, {
                      shouldValidate: true,
                    });
                  }}
                />
                {errors.closingDay && (
                  <p className="text-sm text-red-500">{errors.closingDay.message}</p>
                )}
                <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <p className="font-medium">
                    ℹ️ Compras após o fechamento entram na próxima fatura.
                  </p>
                  {closingDay && dueDay ? (
                    <p>
                      Ex.: fechamento {closingDay}, vencimento {dueDay}. Compra dia{" "}
                      {Math.max(1, closingDay - 1)} cai nesta fatura; dia{" "}
                      {Math.min(31, closingDay + 1)}, na próxima.
                    </p>
                  ) : (
                    <p>
                      Ex.: fechamento 10, vencimento 15. Compra dia 9 cai nesta
                      fatura; dia 11, na próxima.
                    </p>
                  )}
                  {closingDay && dueDay && dueDay < closingDay && (
                    <p>
                      Como o vencimento é menor que o fechamento, ele será no mês
                      seguinte.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="dueDay">Dia de vencimento</label>
                <Input
                  id="dueDay"
                  type="number"
                  min={1}
                  max={31}
                  step={1}
                  placeholder="1 a 31"
                  value={dueDay ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setValue("dueDay", value ? Number(value) : undefined, {
                      shouldValidate: true,
                    });
                  }}
                />
                {errors.dueDay && (
                  <p className="text-sm text-red-500">{errors.dueDay.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="paymentAccountWalletId">
                  Conta padrão para pagamento da fatura
                  Você poderá escolher outra conta ao pagar manualmente.
                </label>
                <Select
                  value={paymentAccountWalletId ?? "none"}
                  onValueChange={(value) =>
                    setValue(
                      "paymentAccountWalletId",
                      value === "none" ? null : value,
                    )
                  }
                >
                  <SelectTrigger id="paymentAccountWalletId">
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem conta padrão</SelectItem>
                    {paymentAccountOptions.map((wallet) => (
                      <SelectItem key={wallet.id} value={wallet.id as string}>
                        {wallet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Se definida, ao pagar a fatura criaremos automaticamente uma transação de saída nessa conta.
                </p>
                <p className="text-xs text-muted-foreground">
                  Você poderá escolher outra conta no momento do pagamento.
                </p>
              </div>
            </>
          )}

          <div className="flex justify-between gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <div className="flex gap-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancelar
                </Button>
              )}
              <Button type="submit">
                {isEditing
                  ? "Salvar alterações"
                  : financialType === "CREDIT_CARD"
                    ? "Criar cartão"
                    : "Criar carteira"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
