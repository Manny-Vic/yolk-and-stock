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

- Golden Nest Egg Depot POS is a local prototype: all state lives in one zustand store persisted to localStorage (`src/store/useStore.ts`, key `golden-nest-pos-v1`, `skipHydration: true` + rehydrate from `__root.tsx` effect). No backend; do not add server functions for its data without migrating storage.
- All money is integer centavos end-to-end (`src/lib/money.ts`); totals are always recomputed from line items via `src/lib/calc.ts` — never store manually edited totals.
<!-- LOVABLE:END:project-decisions -->
