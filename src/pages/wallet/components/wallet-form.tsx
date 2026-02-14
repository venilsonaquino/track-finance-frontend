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
import * as yup from "yup";
import { WalletRequest } from "@/api/dtos/wallet/wallet-request";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { BankSelector } from "@/components/bank-selector";

const schema = yup.object().shape({
  name: yup.string().required("Nome é obrigatório"),
  description: yup.string().required("Descrição é obrigatória"),
  walletType: yup.string().required("Tipo é obrigatório"),
  balance: yup.number().required("Saldo inicial é obrigatório"),
  bankId: yup.string().optional(),
});

interface WalletFormProps {
  initialData?: Partial<WalletResponse>;
  onSubmit: (data: WalletRequest) => void;
  onInputChange: (field: string | number | symbol, value: string | number) => void;
  onCancel?: () => void;
}

export const WalletForm = ({
  initialData,
  onSubmit,
  onInputChange,
}: WalletFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<WalletRequest>({
    resolver: yupResolver(schema) as any,
    defaultValues: initialData,
  });

  const bankId = watch("bankId");

  const handleBankChange = (value: string) => {
    setValue("bankId", value);
    onInputChange("bankId", value);
  };

  const handleFormSubmit = (data: WalletRequest) => {
    const formData = {
      ...data,
      balance: Number(data.balance),
    };
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name">Nome</label>
        <Input
          id="name"
          {...register("name")}
        />
        {errors.name && <p className="text-red-500">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="description">Descrição</label>
        <Textarea
          id="description"
          {...register("description")}
        />
        {errors.description && <p className="text-red-500">{errors.description.message}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="bank">Banco</label>
        <BankSelector
          value={bankId}
          onValueChange={handleBankChange}
          placeholder="Selecione um banco (opcional)"
        />
        <p className="text-sm text-muted-foreground">
          O logo do banco será usado como ícone da carteira
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="type">Tipo</label>
        <Select
          value={watch("walletType")}
          onValueChange={(value) => {
            setValue("walletType", value);
            onInputChange("walletType", value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="personal">Pessoal</SelectItem>
            <SelectItem value="business">Empresarial</SelectItem>
            <SelectItem value="savings">Poupança</SelectItem>
          </SelectContent>
        </Select>
        {errors.walletType && <p className="text-red-500">{errors.walletType.message}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="initialBalance">Saldo Inicial</label>
        <Input
          type="number"
          id="initialBalance"
          {...register("balance")}
        />
        {errors.balance && <p className="text-red-500">{errors.balance.message}</p>}
      </div>

      <Button type="submit" className="w-full">
        {initialData ? "Salvar Alterações" : "Criar Carteira"}
      </Button>
    </form>
  );
}; 