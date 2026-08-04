# Task 2 Report: Workshop Provider Adapters

## What I Implemented

- Added `createLocalWorkshopProvider` in `jiu-app/lib/workshop/local-provider.ts`.
  It creates lightweight, deterministic local task IDs and returns an immediate
  normalized `succeeded` task with a sample-audio result.
- Added `createRemoteWorkshopProvider` in `jiu-app/lib/workshop/remote-provider.ts`.
  It posts drafts to `POST /api/workshop/generate`, reads tasks from
  `GET /api/workshop/tasks/:id`, maps upstream task/result fields and statuses
  to the shared workshop contract, and throws on failed or invalid creation
  responses so callers can choose the local fallback.
- Added `selectWorkshopProvider` and `createWorkshopProvider` in
  `jiu-app/lib/workshop/provider.ts`. A non-empty `baseUrl` selects the
  upstream adapter; otherwise the local adapter is used, including its optional
  sample-audio URL override.
- Added provider tests for local normalized results, upstream payload
  translation, remote task lookup, and provider selection.

## What I Tested And Results

- `node --test --experimental-strip-types jiu-app/lib/workshop/provider.test.ts`
  passed: 4 tests, 0 failures.
- `node --test --experimental-strip-types jiu-app/lib/workshop/normalize.test.ts jiu-app/lib/workshop/storage.test.ts jiu-app/lib/workshop/provider.test.ts`
  passed: 10 tests, 0 failures.
- `cd jiu-app; npx eslint lib/workshop/local-provider.ts lib/workshop/remote-provider.ts lib/workshop/provider.ts lib/workshop/provider.test.ts`
  passed with no lint output.
- `git diff --check` passed with no whitespace errors.

## TDD Evidence

### RED

Command:

```powershell
node --test --experimental-strip-types jiu-app/lib/workshop/provider.test.ts
```

Relevant output before implementation:

```text
ERR_MODULE_NOT_FOUND: Cannot find module .../lib/workshop/local-provider.ts
tests 1
pass 0
fail 1
```

### GREEN

Command:

```powershell
node --test --experimental-strip-types jiu-app/lib/workshop/provider.test.ts
```

Relevant output after implementation:

```text
tests 4
pass 4
fail 0
```

The subsequent complete workshop-module run passed all 10 tests.

## Files Changed

- `jiu-app/lib/workshop/local-provider.ts`
- `jiu-app/lib/workshop/remote-provider.ts`
- `jiu-app/lib/workshop/provider.ts`
- `jiu-app/lib/workshop/provider.test.ts`
- `.superpowers/sdd/2026-08-04-upstream-workshop-fallback/task-2-report.md`

## Self-Review Findings

- No blocking or actionable findings in the Task 2 diff.
- The adapter does not own fallback policy: remote creation failures reject so
  the forthcoming client/page layer can retry through the local provider while
  retaining one shared task contract.
- Optional normalized fields are omitted when absent rather than included as
  `undefined`, preserving the shared contract shape.

## Issues Or Concerns

- Direct Node TypeScript tests emit the pre-existing
  `MODULE_TYPELESS_PACKAGE_JSON` warning because `jiu-app/package.json` has no
  `"type": "module"`; this is outside Task 2 scope.
- A supplemental `cd jiu-app; npx tsc --noEmit` check remains blocked by three
  pre-existing readonly `process.env.NODE_ENV` errors in
  `lib/server/cookies.test.ts`. The new provider files lint and test cleanly.
- No upstream service is configured or connected yet. The adapter endpoint
  paths are based on the repository's documented workshop API shape and remain
  intentionally isolated from the UI until the later integration task.
