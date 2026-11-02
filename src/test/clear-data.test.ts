import { beforeEach, describe, expect, it } from "vitest";

import { useStore } from "@/store/useStore";

describe("bulk data clearing", () => {
  beforeEach(() => {
    useStore.getState().resetDemo();
  });

  it("clearOrders removes all orders and releases reservations, keeping products", () => {
    const before = useStore.getState();
    expect(before.orders.length).toBeGreaterThan(0);
    const products = before.products;

    useStore.getState().clearOrders();

    const after = useStore.getState();
    expect(after.orders).toEqual([]);
    expect(after.products.length).toBe(products.length);
    after.products.forEach((p) => expect(p.reserved).toBe(0));
    expect(after.cashEntries.length).toBe(before.cashEntries.length);
  });

  it("clearPurchases removes all purchase orders", () => {
    expect(useStore.getState().purchases.length).toBeGreaterThan(0);
    useStore.getState().clearPurchases();
    expect(useStore.getState().purchases).toEqual([]);
  });

  it("clearCustomers removes all customers and resets the cart to walk-in", () => {
    useStore.getState().updateCart({ customerId: useStore.getState().customers[0].id, customerName: "Someone" });
    useStore.getState().clearCustomers();
    const st = useStore.getState();
    expect(st.customers).toEqual([]);
    expect(st.cart.customerId).toBeNull();
    expect(st.cart.customerName).toBe("Walk-in Customer");
  });

  it("clearExpenses removes expenses and their cash flow entries only", () => {
    const before = useStore.getState();
    const nonExpense = before.cashEntries.filter((e) => e.kind !== "expense").length;

    useStore.getState().clearExpenses();

    const after = useStore.getState();
    expect(after.expenses).toEqual([]);
    expect(after.cashEntries.length).toBe(nonExpense);
    after.cashEntries.forEach((e) => expect(e.kind).not.toBe("expense"));
  });

  it("clearCashFlow empties cash entries but keeps accounts", () => {
    useStore.getState().clearCashFlow();
    const st = useStore.getState();
    expect(st.cashEntries).toEqual([]);
    expect(st.accounts.length).toBeGreaterThan(0);
  });

  it("clearAllData empties every business area, keeps products/suppliers/settings, and resets counters", () => {
    const before = useStore.getState();
    useStore.getState().clearAllData();
    const after = useStore.getState();

    expect(after.orders).toEqual([]);
    expect(after.purchases).toEqual([]);
    expect(after.customers).toEqual([]);
    expect(after.expenses).toEqual([]);
    expect(after.cashEntries).toEqual([]);
    expect(after.cart.lines).toEqual([]);
    expect(after.nextSeqOrder).toBe(1);
    expect(after.nextSeqPurchase).toBe(1);
    expect(after.products.length).toBe(before.products.length);
    after.products.forEach((p) => expect(p.reserved).toBe(0));
    expect(after.suppliers.length).toBe(before.suppliers.length);
    expect(after.settings).toEqual(before.settings);
    expect(after.auditLog).toHaveLength(1);
    expect(after.auditLog[0].action).toBe("Data cleared");
  });
});
