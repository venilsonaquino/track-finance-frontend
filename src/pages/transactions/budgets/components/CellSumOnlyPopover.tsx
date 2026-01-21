import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { History } from "lucide-react";
import { formatCurrency, maskCurrencyInput } from "@/utils/currency-utils";
import { cn } from "@/lib/utils";

type CellSumOnlyPopoverProps = {
  value: number;
  onAdd: (delta: number) => void;
  onUndo: () => void;
  compact?: boolean;
  locale?: string;
  currency?: string;
  pending?: boolean;
  pendingEntries?: Array<{ id: string; delta: number }>;
};

export default function CellSumOnlyPopover({
  value,
  onAdd,
  onUndo,
  compact = false,
  pending = false,
  pendingEntries = [],
  locale,
  currency,
}: CellSumOnlyPopoverProps) {
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  function parseBRDecimal(v: string) {
    const norm = v.replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ".");
    const n = Number(norm);
    return Number.isFinite(n) ? n : 0;
  }

  const commit = () => {
    const delta = parseBRDecimal(temp);
    if (delta > 0) {
      onAdd(delta);
      setFlash(`+ ${formatCurrency(delta, locale, currency)}`);
      setTimeout(() => setFlash(null), 900);
      setTemp("");
      setOpen(false);
    }
  };

  const undoLast = () => {
    if (!pendingEntries.length) return;
    onUndo();
  };

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Input
            readOnly
            className={cn(
              `text-center ${compact ? "h-8" : "h-9"} w-full cursor-pointer transition-all duration-200`,
              pending &&
                "border-amber-400 bg-amber-50/80 dark:border-amber-500/60 dark:bg-amber-900/20",
              open
                ? "border-amber-300 ring-1 ring-amber-200/70 bg-amber-50/50 dark:border-amber-500/40 dark:ring-amber-500/40 dark:bg-amber-900/30"
                : "hover:border-amber-200/70"
            )}
            value={formatCurrency(value, locale, currency)}
            placeholder="0,00"
          />
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="end" sideOffset={6}>
          <div className="text-xs text-muted-foreground mb-2">Somar nesta célula</div>
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              inputMode="decimal"
              className={`text-right ${compact ? "h-8" : "h-9"}`}
              placeholder="0,00"
              value={temp}
              onChange={(e) => setTemp(maskCurrencyInput(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setOpen(false);
              }}
            />
            <Button size="sm" className={`${compact ? "h-8" : "h-9"}`} onClick={commit}>Adicionar</Button>
          </div>
          {/* Histórico local resumido e Undo do último */}
          <div className="mt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <History className="w-3.5 h-3.5" /> últimos lançamentos
            </div>
            {pendingEntries.length === 0 ? (
              <div className="text-xs text-muted-foreground mt-1">Nenhum lançamento ainda.</div>
            ) : (
              <ul className="mt-1 max-h-24 overflow-auto pr-1 space-y-1">
                {pendingEntries.map((entry, i) => (
                  <li key={entry.id} className="text-xs flex items-center justify-between bg-muted/40 rounded px-2 py-1">
                    <span>{formatCurrency(entry.delta, locale, currency)}</span>
                    {i === 0 && (
                      <button onClick={undoLast} className="text-[11px] underline cursor-pointer">desfazer</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {flash && (
        <span className="pointer-events-none absolute -top-5 right-2 text-xs font-medium text-emerald-500 opacity-0 animate-[fadeUp_0.9s_ease-out_forwards]">
          {flash}
        </span>
      )}

      <style>{`
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(6px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
