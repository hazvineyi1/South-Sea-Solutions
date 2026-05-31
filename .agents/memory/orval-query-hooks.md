---
name: Orval generated query hook usage
description: How to call the generated TanStack Query hooks in this repo without type errors.
---

The Orval codegen emits query hooks as `export function useGetXxx(...)` (NOT `export const`),
plus a matching `getGetXxxQueryKey(...)` helper.

Rule: when you pass a partial `query` options object to a generated hook, you MUST also pass
`queryKey` explicitly using the matching helper. Omitting it is a type error.

**Why:** the generated hook's `query` option type requires `queryKey` once you override any
query option; the hook does not auto-fill it when options are partially supplied.

**How to apply:**
```ts
useGetDriverRecord(id, {
  query: { queryKey: getGetDriverRecordQueryKey(id), enabled: Boolean(id), retry: false },
});
```
Prefer the direct hook over `useQuery({ ...getGetXxxQueryOptions() })` for these endpoints.
