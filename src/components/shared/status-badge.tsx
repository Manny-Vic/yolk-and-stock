import { Badge } from "@/components/ui/badge";
import { FULFILLMENT_LABELS, PAYMENT_LABELS, STATUS_TONES, paymentStatus } from "@/lib/calc";
import type { FulfillmentStatus, Order } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONES = {
  default: "bg-primary text-primary-foreground border-transparent",
  secondary: "bg-secondary text-secondary-foreground border-transparent",
  success: "bg-primary/10 text-primary border-primary/25",
  warning: "bg-warning/20 text-warning-foreground border-warning/40",
  destructive: "bg-destructive/10 text-destructive border-destructive/25",
  outline: "text-muted-foreground",
} as const;

export type BadgeTone = keyof typeof TONES;

export function ToneBadge({
  tone = "outline",
  className,
  children,
}: {
  tone?: BadgeTone | null | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <Badge variant="outline" className={cn(TONES[tone ?? "outline"], className)}>
      {children}
    </Badge>
  );
}

export function StatusBadge({ status, className }: { status: FulfillmentStatus; className?: string | undefined }) {
  return (
    <ToneBadge tone={STATUS_TONES[status] as BadgeTone} className={className}>
      {FULFILLMENT_LABELS[status]}
    </ToneBadge>
  );
}

export function PaymentBadge({ order, className }: { order: Order; className?: string | undefined }) {
  const { status, overdue } = paymentStatus(order);
  if (overdue) {
    return (
      <ToneBadge tone="destructive" className={className}>
        Overdue
      </ToneBadge>
    );
  }
  const tone: BadgeTone = status === "paid" ? "success" : status === "partially_paid" ? "warning" : "outline";
  return (
    <ToneBadge tone={tone} className={className}>
      {PAYMENT_LABELS[status]}
    </ToneBadge>
  );
}
