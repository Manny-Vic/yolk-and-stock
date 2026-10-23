import { cva, type VariantProps } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
import { FULFILLMENT_LABELS, PAYMENT_LABELS, STATUS_TONES, paymentStatus } from "@/lib/calc";
import type { FulfillmentStatus, Order } from "@/lib/types";
import { cn } from "@/lib/utils";

const badgeTones = cva("", {
  variants: {
    tone: {
      default: "bg-primary text-primary-foreground border-transparent",
      secondary: "bg-secondary text-secondary-foreground border-transparent",
      success: "bg-primary/10 text-primary border-primary/25",
      warning: "bg-warning/20 text-warning-foreground border-warning/40",
      destructive: "bg-destructive/10 text-destructive border-destructive/25",
      outline: "text-muted-foreground",
    },
  },
  defaultVariants: { tone: "outline" },
});

export interface ToneBadgeProps extends VariantProps<typeof badgeTones> {
  children: React.ReactNode;
  className?: string;
}

export function ToneBadge({ tone, className, children }: ToneBadgeProps) {
  return (
    <Badge variant="outline" className={cn(badgeTones({ tone }), className)}>
      {children}
    </Badge>
  );
}

export function StatusBadge({ status, className }: { status: FulfillmentStatus; className?: string }) {
  return (
    <ToneBadge tone={STATUS_TONES[status] as ToneBadgeProps["tone"]} className={className}>
      {FULFILLMENT_LABELS[status]}
    </ToneBadge>
  );
}

export function PaymentBadge({ order, className }: { order: Order; className?: string }) {
  const { status, overdue } = paymentStatus(order);
  if (overdue) {
    return (
      <ToneBadge tone="destructive" className={className}>
        Overdue
      </ToneBadge>
    );
  }
  const tone = status === "paid" ? "success" : status === "partially_paid" ? "warning" : "outline";
  return (
    <ToneBadge tone={tone} className={className}>
      {PAYMENT_LABELS[status]}
    </ToneBadge>
  );
}
