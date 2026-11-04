import { Delete } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PIN_LENGTH_MAX } from "@/lib/pin";
import { cn } from "@/lib/utils";

/** Big-button numeric PIN entry for touch screens and keyboards. */
export function PinPad({
  value,
  onChange,
  onSubmit,
  disabled,
  submitLabel = "Enter",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  submitLabel?: string;
}) {
  const press = (d: string) => {
    if (value.length < PIN_LENGTH_MAX) onChange(value + d);
  };
  return (
    <div
      className="space-y-3"
      tabIndex={0}
      onKeyDown={(e) => {
        if (/^\d$/.test(e.key)) press(e.key);
        else if (e.key === "Backspace") onChange(value.slice(0, -1));
        else if (e.key === "Enter") onSubmit();
      }}
    >
      <div className="flex justify-center gap-2" aria-label={`${value.length} digits entered`}>
        {Array.from({ length: PIN_LENGTH_MAX }).map((_, i) => (
          <span
            key={i}
            className={cn("size-3 rounded-full border border-primary/40", i < value.length && "bg-primary")}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Button key={d} type="button" variant="outline" className="h-12 text-lg font-bold" disabled={disabled} onClick={() => press(d)}>
            {d}
          </Button>
        ))}
        <Button type="button" variant="ghost" className="h-12" disabled={disabled} aria-label="Delete digit" onClick={() => onChange(value.slice(0, -1))}>
          <Delete className="size-5" />
        </Button>
        <Button type="button" variant="outline" className="h-12 text-lg font-bold" disabled={disabled} onClick={() => press("0")}>
          0
        </Button>
        <Button type="button" className="h-12 font-bold" disabled={disabled || value.length < 4} onClick={onSubmit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
