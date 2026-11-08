import { beforeEach, describe, expect, it } from "vitest";

import { accountBalances } from "@/lib/derive";
import { useStore } from "@/store/useStore";

describe("start fresh and account balances", () => {
  beforeEach(() => {
    useStore.getState().resetDemo();
  });

  it("startFresh removes all sample records and zeroes every account", () => {
    const before = useStore.getState();
    expect(before.accounts.some((a) => a.opening > 0)).toBe(true);
    const staff = before.staff;
    const settings = before.settings;

    useStore.getState().startFresh();

    const s = useStore.getState();
    expect(s.products).toEqual([]);
    expect(s.suppliers).toEqual([]);
    expect(s.customers).toEqual([]);
    expect(s.orders).toEqual([]);
    expect(s.purchases).toEqual([]);
    expect(s.expenses).toEqual([]);
    expect(s.cashEntries).toEqual([]);
    expect(s.shifts).toEqual([]);
    expect(s.nextSeqOrder).toBe(1);
    expect(s.nextSeqPurchase).toBe(1);
    expect(s.accounts.length).toBe(before.accounts.length);
    s.accounts.forEach((a) => expect(a.opening).toBe(0));
    const balances = accountBalances(s.accounts, s.cashEntries);
    Object.values(balances).forEach((b) => expect(b.closing).toBe(0));
    expect(s.staff).toEqual(staff);
    expect(s.settings).toEqual(settings);
    expect(s.auditLog).toHaveLength(1);
  });

  it("updateAccount changes the opening balance and logs it", () => {
    useStore.getState().startFresh();
    useStore.getState().updateAccount("acc-cash", { opening: 500_000 });
    const s = useStore.getState();
    expect(s.accounts.find((a) => a.id === "acc-cash")?.opening).toBe(500_000);
    expect(s.auditLog[0]?.action).toBe("Account updated");
    expect(accountBalances(s.accounts, s.cashEntries)["acc-cash"]?.closing).toBe(500_000);
  });

  it("updateAccount ignores negative balances and unknown accounts", () => {
    useStore.getState().startFresh();
    useStore.getState().updateAccount("acc-cash", { opening: -100 });
    expect(useStore.getState().accounts.find((a) => a.id === "acc-cash")?.opening).toBe(0);
    const logLen = useStore.getState().auditLog.length;
    useStore.getState().updateAccount("nope", { opening: 100 });
    expect(useStore.getState().auditLog.length).toBe(logLen);
  });

  it("updateAccount renames an account and keeps blank names out", () => {
    useStore.getState().updateAccount("acc-bank", { name: "  My Bank  " });
    expect(useStore.getState().accounts.find((a) => a.id === "acc-bank")?.name).toBe("My Bank");
    useStore.getState().updateAccount("acc-bank", { name: "   " });
    expect(useStore.getState().accounts.find((a) => a.id === "acc-bank")?.name).toBe("My Bank");
  });

  it("zeroAccountBalances zeroes openings but keeps cash entries", () => {
    const entries = useStore.getState().cashEntries.length;
    useStore.getState().zeroAccountBalances();
    const s = useStore.getState();
    s.accounts.forEach((a) => expect(a.opening).toBe(0));
    expect(s.cashEntries.length).toBe(entries);
  });
});
