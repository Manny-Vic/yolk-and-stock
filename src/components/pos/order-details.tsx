import { useState } from "react";
import { Check, ChevronsUpDown, ChevronDown, SlidersHorizontal } from "lucide-react";

import { EditableNumber } from "@/components/shared/editable-number";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { calcOrder } from "@/lib/calc";
import { ORDER_SOURCES } from "@/lib/types";
import { fmtPeso, parsePercent, parsePeso, todayISO } from "@/lib/money";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

export function OrderDetails() {
  const cart = useStore((s) => s.cart);
  const customers = useStore((s) => s.customers);
  const updateCart = useStore((s) => s.updateCart);
  const [open, setOpen] = useState(false);
  const [custOpen, setCustOpen] = useState(false);
  const totals = calcOrder(cart);
  const isPercent = cart.orderDiscountType === "percent";

  const pickCustomer = (id: string | null) => {
    const c = id ? customers.find((x) => x.id === id) : undefined;
    updateCart({ customerId: c?.id ?? null, customerName: c?.name ?? "Walk-in Customer" });
    setCustOpen(false);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex w-full items-center justify-between border-t px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" />
            Order details, discounts & delivery
            {(cart.orderDiscount > 0 || cart.customerId || cart.notes || cart.deliveryFee > 0) && (
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">filled</span>
            )}
          </span>
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-secondary/40 p-3">
            <Label className="text-xs">Order-level discount</Label>
            <div className="mt-1.5 flex items-start gap-1.5">
              <button
                type="button"
                title={isPercent ? "Switch to fixed peso discount" : "Switch to percent discount"}
                onClick={() => updateCart({ orderDiscountType: isPercent ? "fixed" : "percent" })}
                className="mt-0.5 rounded-md border bg-background px-2 py-1.5 text-xs font-bold text-muted-foreground hover:bg-accent"
              >
                {isPercent ? "%" : "₱"}
              </button>
              <EditableNumber
                ariaLabel="Order-level discount"
                value={cart.orderDiscount}
                display={cart.orderDiscount > 0 ? (isPercent ? `${cart.orderDiscount}%` : fmtPeso(cart.orderDiscount)) : "None"}
                draft={cart.orderDiscount > 0 ? (isPercent ? String(cart.orderDiscount) : (cart.orderDiscount / 100).toFixed(2)) : ""}
                parse={isPercent ? parsePercent : parsePeso}
                onCommit={(v) => updateCart({ orderDiscount: v })}
                className="min-w-24 text-sm font-semibold"
              />
            </div>
            {totals.orderDiscount > 0 ? (
              <p className="mt-1.5 text-[11px] text-muted-foreground">Applies −{fmtPeso(totals.orderDiscount)} to the total.</p>
            ) : null}
          </div>

          <div className="rounded-lg border bg-secondary/40 p-3">
            <Label className="text-xs">Customer</Label>
            <div className="mt-1.5 flex gap-1.5">
              <Popover open={custOpen} onOpenChange={setCustOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="h-9 flex-1 justify-between font-normal">
                    <span className="truncate">{cart.customerName}</span>
                    <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search customers…" />
                    <CommandList>
                      <CommandEmpty>No customer found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="walk-in" onSelect={() => pickCustomer(null)}>
                          <Check className={cn("mr-1 size-3.5", !cart.customerId ? "opacity-100" : "opacity-0")} />
                          Walk-in Customer
                        </CommandItem>
                        {customers.map((c) => (
                          <CommandItem key={c.id} value={c.name} onSelect={() => pickCustomer(c.id)}>
                            <Check className={cn("mr-1 size-3.5", cart.customerId === c.id ? "opacity-100" : "opacity-0")} />
                            <span className="truncate">{c.name}</span>
                            <span className="ml-auto text-[11px] text-muted-foreground">{c.dueDays}-day terms</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Order source</Label>
              <Select value={cart.source} onValueChange={(v) => updateCart({ source: v })}>
                <SelectTrigger className="mt-1.5 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORDER_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Source detail</Label>
              <Input
                className="mt-1.5 h-9"
                placeholder="e.g. FB page or referrer"
                value={cart.sourceDetail}
                onChange={(e) => updateCart({ sourceDetail: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Fulfillment</Label>
              <Select value={cart.fulfillment} onValueChange={(v) => updateCart({ fulfillment: v as "delivery" | "pickup" })}>
                <SelectTrigger className="mt-1.5 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">Store pickup</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Requested date</Label>
              <Input
                type="date"
                min={todayISO()}
                className="mt-1.5 h-9"
                value={cart.requestedDate}
                onChange={(e) => updateCart({ requestedDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Delivery fee</Label>
            <EditableNumber
              ariaLabel="Delivery fee"
              value={cart.deliveryFee}
              display={cart.deliveryFee > 0 ? fmtPeso(cart.deliveryFee) : "None"}
              draft={cart.deliveryFee > 0 ? (cart.deliveryFee / 100).toFixed(2) : ""}
              parse={parsePeso}
              onCommit={(v) => updateCart({ deliveryFee: v })}
              className="mt-1.5 min-w-24 text-sm font-semibold"
            />
          </div>

          <div>
            <Label className="text-xs">Order notes (shown on receipt)</Label>
            <Textarea
              className="mt-1.5 min-h-9 rows-2"
              placeholder='e.g. "Deliver tomorrow morning. Handle cases carefully."'
              value={cart.notes}
              onChange={(e) => updateCart({ notes: e.target.value })}
            />
          </div>

          <div className="sm:col-span-2">
            <Label className="text-xs">Internal staff notes</Label>
            <Input
              className="mt-1.5 h-9"
              placeholder="Visible to staff only"
              value={cart.staffNotes}
              onChange={(e) => updateCart({ staffNotes: e.target.value })}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
