<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

<!-- LOVABLE:BEGIN:project-decisions -->
## Project decisions

- All POS state lives in one zustand store (`src/store/useStore.ts`, localStorage cache `golden-nest-pos-v1`); business data (`SYNCED_KEYS`) is synced as one JSON snapshot per depot account to the Lovable Cloud `pos_state` table by `src/lib/cloud-sync.ts`, with daily copies in `pos_backups` — so records survive cleared browsers and show on every device. Add new business data to `SYNCED_KEYS`; keep per-device state (cart, `activeStaffId`) out of it.
- Business pages live under `src/routes/_authenticated/` (depot account sign-in at `/auth`); inside, staff unlock with hashed PINs (`src/lib/pin.ts`) and owner-only actions go through `requestOwnerApproval` — never check roles ad hoc.
- Checkout requires an open shift; every cash entry is tagged with `shiftId` so `src/lib/shift.ts` can compute expected drawer cash.
- All money is integer centavos end-to-end (`src/lib/money.ts`); totals are always recomputed from line items via `src/lib/calc.ts` — never store manually edited totals.
<!-- LOVABLE:END:project-decisions -->
