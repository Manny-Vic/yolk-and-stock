import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface EditableTextProps {
  value: string;
  /** Apply the new text; return an error message to keep editing */
  onCommit: (value: string) => string | null | void;
  ariaLabel: string;
  className?: string;
  inputClassName?: string;
  maxLength?: number;
}

/** Click-to-edit text. Enter commits, Escape cancels, blur commits. */
export function EditableText({
  value,
  onCommit,
  ariaLabel,
  className,
  inputClassName,
  maxLength = 40,
}: EditableTextProps) {
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
    setDraft(value);
    setError(null);
    setEditing(true);
  };

  const commit = () => {
    if (settled.current) return;
    const text = draft.trim();
    if (!text) {
      setError("Enter a name");
      return;
    }
    const err = onCommit(text);
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
        title="Click to rename"
        className={cn(
          "cursor-text rounded-md px-1.5 py-0.5 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring",
          className,
        )}
      >
        {value}
      </button>
    );
  }

  return (
    <span className="relative inline-flex w-full">
      <input
        ref={inputRef}
        value={draft}
        maxLength={maxLength}
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
          "w-full rounded-md border border-ring bg-background px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-ring/40",
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
