---
name: Stale lib .d.ts causes phantom leaf typecheck errors
description: Why a leaf artifact typecheck reports type errors that contradict the current generated source, and how to fix it.
---

A leaf artifact (e.g. `@workspace/api-server`) can fail `tsc -p tsconfig.json --noEmit`
with a type error that contradicts the actual source of a workspace lib — for example
"Property 'password' does not exist" on a generated Zod body whose source clearly has it.

**Why:** artifacts consume `lib/*` packages through TypeScript project references, which
resolve to the lib's emitted `dist/*.d.ts`, not its `src`. After OpenAPI codegen (or any
lib source change) regenerates `lib/api-zod/src`, the `dist` declarations are stale until
the libs are rebuilt. The leaf typecheck then reads the old shape.

**How to apply:** when a leaf typecheck error contradicts current lib source, rebuild the
libs first: `pnpm run typecheck:libs` (i.e. `tsc --build`). The canonical `pnpm run typecheck`
already builds libs before leaf checks, so it self-heals; running a single package's
typecheck in isolation does not. Always rebuild libs after running `api-spec` codegen.
