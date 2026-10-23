import { useStore } from "@/store/useStore";
import { fmtPeso } from "@/lib/money";
import { ToneBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";

const QUICK = [1, 5, 10];

export function ProductGrid() {
  const products = useStore((s) => s.products);
  const cartLines = useStore((s) => s.cart.lines);
  const addToCart = useStore((s) => s.addToCart);
  const reserve = useStore((s) => s.settings.reserveOnConfirm);

  return (
    <div className="grid grid-cols-2 gap-3 p-3 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-2">
      {products.map((p) => {
        const available = Math.max(0, reserve ? p.cases - p.reserved : p.cases);
        const inCart = cartLines.filter((l) => l.productId === p.id).reduce((s, l) => s + l.qty, 0);
        const low = available <= p.reorderThreshold;
        const out = available <= 0;
        return (
          <div
            key={p.id}
            role="button"
            tabIndex={0}
            aria-label={`Add one case of ${p.name}`}
            onClick={() => !out && addToCart(p.id)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !out) {
                e.preventDefault();
                addToCart(p.id);
              }
            }}
            className={cn(
              "group cursor-pointer select-none overflow-hidden rounded-xl border bg-card shadow-card transition-all hover:-translate-y-px hover:shadow-pop focus-visible:outline-2 focus-visible:outline-ring",
              inCart > 0 && "border-primary ring-2 ring-primary/25",
              out && "cursor-not-allowed opacity-55",
            )}
          >
            <div className="relative">
              <img src={p.image} alt={p.name} loading="lazy" width={768} height={768} className="h-24 w-full object-cover" />
              {inCart > 0 ? (
                <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground shadow">
                  {inCart} in order
                </span>
              ) : null}
              {low && !out ? (
                <span className="absolute left-2 top-2 rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-warning-foreground shadow">
                  Low stock
                </span>
              ) : null}
              {out ? (
                <span className="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground shadow">
                  Out of stock
                </span>
              ) : null}
            </div>
            <div className="p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-bold">{p.name}</span>
                <span className="shrink-0 text-base font-extrabold tabular-nums text-primary">{fmtPeso(p.defaultPrice)}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="truncate">{p.size}</span>
                <span className="shrink-0 tabular-nums">
                  {available} case{available === 1 ? "" : "s"}
                  {reserve && p.reserved > 0 ? ` · ${p.reserved} res.` : ""}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5" onClick={(e) => e.stopPropagation()}>
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={out}
                    onClick={() => addToCart(p.id, q)}
                    className="rounded-lg border bg-secondary/70 py-1 text-xs font-bold transition hover:bg-accent active:scale-95 disabled:opacity-50"
                  >
                    +{q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}
      <p className="col-span-full flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
        <ToneBadge tone="secondary">Tip</ToneBadge>
        Click a card to add 1 case · use +1 / +5 / +10 to jump · click any number in the order to edit it.
      </p>
    </div>
  );
}
