import { beforeEach, describe, expect, it } from "vitest";

import { accountBalances } from "@/lib/derive";
import { useStore } from "@/store/useStore";

const addOne = (amount: number) => {
  useStore.getState().addExpense({ date: "2026-11-10", category: "Rent", amount, method: "cash", payee: "Landlord" });
  return useStore.getState().expenses[0]!;
};
const cashClosing = () => {
  const s = useStore.getState();
  return accountBalances(s.accounts, s.cashEntries)[s.accounts.find((a) => a.id === "acc-cash")!.id]!.closing;
};

describe("expense correction", () => {
  beforeEach(() => {
    useStore.getState().startFresh();
    useStore.getState().updateAccount("acc-cash", { opening: 1_000_000 });
  });

  it("keeps the old amount in history and counts only the new one", () => {
    const e = addOne(450_000);
    expect(cashClosing()).toBe(550_000);

    expect(useStore.getState().correctExpense(e.id, 45_000, "typo")).toBeNull();

    const fixed = useStore.getState().expenses.find((x) => x.id === e.id)!;
    expect(fixed.amount).toBe(45_000);
    expect(fixed.corrections).toHaveLength(1);
    expect(fixed.corrections![0]).toMatchObject({ from: 450_000, to: 45_000, reason: "typo" });
    expect(useStore.getState().expenses).toHaveLength(1);
    expect(cashClosing()).toBe(955_000);
  });

  it("charges the extra when corrected upward and survives several corrections", () => {
    const e = addOne(10_000);
    useStore.getState().correctExpense(e.id, 25_000);
    useStore.getState().correctExpense(e.id, 20_000);
    const fixed = useStore.getState().expenses[0]!;
    expect(fixed.amount).toBe(20_000);
    expect(fixed.corrections!.map((c) => [c.from, c.to])).toEqual([[10_000, 25_000], [25_000, 20_000]]);
    expect(cashClosing()).toBe(980_000);
    expect(useStore.getState().auditLog[0]!.action).toBe("Expense corrected");
  });

  it("rejects bad input and changes nothing", () => {
    const e = addOne(10_000);
    const before = useStore.getState().cashEntries.length;
    expect(useStore.getState().correctExpense(e.id, 0)).toMatch(/greater than zero/);
    expect(useStore.getState().correctExpense(e.id, 10_000)).toMatch(/already/);
    expect(useStore.getState().correctExpense("nope", 5)).toMatch(/not found/);
    expect(useStore.getState().cashEntries.length).toBe(before);
    expect(useStore.getState().expenses[0]!.corrections).toBeUndefined();
  });
});
