import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface EditableNumberProps {
  /** Current numeric value (centavos, cases, or percent) */
  value: number;
  /** Text shown while not editing */
  display: string;
  /** Initial text placed in the input when editing starts */
  draft: string;
  /** Parse user input; return null to reject */
  parse: (raw: string) => number | null;
  /** Apply the parsed value; return an error message to keep editing */
  onCommit: (value: number) => string | null | void;
  className?: string;
  inputClassName?: string;
  suffix?: string;
  ariaLabel: string;
}

/**
 * Click-to-edit numeric cell. Enter commits, Escape cancels, blur commits.
 * Invalid or rejected values keep the editor open with an inline message.
 */
export function EditableNumber({
  value,
  display,
  draft: initialDraft,
  parse,
  onCommit,
  className,
  inputClassName,
  suffix,
  ariaLabel,
}: EditableNumberProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const settled = useRef(false);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const start = () => {
    settled.current = false;
    setDraft(initialDraft);
    setError(null);
    setEditing(true);
  };

  const commit = () => {
    if (settled.current) return;
    const parsed = parse(draft);
    if (parsed === null) {
      setError("Enter a valid number");
      return;
    }
    const err = onCommit(parsed);
    if (typeof err === "string" && err) {
      setError(err);
      return;
    }
    settled.current = true;
    setEditing(false);
  };

  const cancel = () => {
    settled.current = true;
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={start}
        aria-label={ariaLabel}
        className={cn(
          "cursor-text rounded-md px-1.5 py-0.5 text-left tabular-nums transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring",
          className,
        )}
      >
        {display}
        {suffix ? <span className="ml-0.5 text-[11px] text-muted-foreground">{suffix}</span> : null}
      </button>
    );
  }

  return (
    <span className="relative inline-flex w-full">
      <input
        ref={inputRef}
        value={draft}
        inputMode="decimal"
        aria-label={ariaLabel}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        onBlur={commit}
        className={cn(
          "w-full rounded-md border border-ring bg-background px-1.5 py-0.5 text-right tabular-nums outline-none focus:ring-2 focus:ring-ring/40",
          error && "border-destructive",
          inputClassName,
        )}
      />
      {error ? (
        <span className="absolute -bottom-5 left-0 z-10 whitespace-nowrap text-[10px] font-medium text-destructive">
          {error}
        </span>
      ) : null}
    </span>
  );
}
