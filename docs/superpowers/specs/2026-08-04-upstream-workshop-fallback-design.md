# Upstream Workshop Compatibility With Unified Fallback

## Goal

Bring the current Jiu workshop flow in line with the upstream `PaxonHuang/jiu-AI-music` workshop shape first, while keeping a local fallback that speaks the same normalized interface.

The key requirement is that fallback behavior must not be a separate legacy path. It must participate in the same workshop task model as the upstream flow so the UI, persistence, and community views can work against one contract.

## Why This Change

- The current workshop page is mostly local simulation with localStorage-backed drafts and published works.
- The upstream project is moving toward task-based workshop generation.
- We want to integrate upstream behavior without breaking the current ability to generate, save, and publish locally.
- A shared task contract will make later backend work easier, regardless of whether the final backend is Cloudflare Workers, Alibaba Cloud, or something else.

## Scope

### In Scope

- Introduce one workshop domain contract for drafts, generation tasks, results, and published works.
- Add a provider layer so the workshop can talk to either:
  - upstream-compatible remote endpoints
  - local fallback simulation
- Update the workshop page to consume the contract instead of directly owning generation logic.
- Update the community page to read the normalized published-work shape.
- Keep legacy localStorage data readable and writable through compatibility logic.

### Out of Scope

- Full email or phone login.
- Replacing the current guest auth implementation.
- Introducing a full database migration layer.
- Rebuilding the entire product architecture.

## Recommended Architecture

### 1. Shared Workshop Contract

Create a small shared module that defines the workshop types and normalized states. The rest of the UI should depend on these types, not on provider-specific payloads.

Core types:

- `WorkshopDraft`
- `WorkshopTask`
- `WorkshopTaskStatus`
- `WorkshopGenerationResult`
- `PublishedWork`
- `WorkshopProvider`

The provider interface should return a normalized result that the page can render directly.

### 2. Provider Layer

Add two providers behind the same interface.

#### Upstream-compatible provider

- Calls the upstream-style music creation flow.
- Uses task-oriented endpoints when available.
- Polls or resolves status until a usable result is available.
- Converts upstream payloads into the normalized workshop contract.

#### Local fallback provider

- Keeps the existing “generate locally” experience.
- Produces the same normalized task/result shape as the upstream provider.
- Uses the same task lifecycle and published-work structure.

### 3. UI Consumption

The workshop page should:

- collect draft data
- submit a generation request through the provider
- show task progress using unified statuses
- render the final result through a shared result model
- save/publish via the normalized `PublishedWork`

The community page should:

- load published works from the same normalized structure
- continue to support legacy local data through a compatibility reader
- render upstream and fallback-generated works identically

## Data Model

### Draft

Represents user input before generation.

Suggested fields:

- title
- idea
- lyrics
- lyricsMode
- instrumental
- genre
- mood
- voice
- instruments

### Workshop Task

Represents one generation attempt, regardless of provider.

Suggested fields:

- id
- status: `idle | queued | running | succeeded | failed`
- provider: `upstream | local`
- prompt or request payload
- progress step labels
- createdAt
- updatedAt
- errorMessage

### Generation Result

Represents the final generated artifact.

Suggested fields:

- taskId
- title
- lyrics
- audioUrl
- coverImageUrl if available
- genre
- mood
- instruments
- sourceProvider

### Published Work

Represents a work that can appear in community.

Suggested fields:

- id
- title
- status: `saved | published`
- audio
- caption
- emoji
- genre
- mood
- createdAt
- authorId
- sourceProvider

## Compatibility Rules

### Legacy local data

Legacy local draft and work records must still load if present.

Compatibility behavior:

- If scoped user data exists, use it first.
- If no scoped data exists, read legacy keys.
- When reading legacy records, normalize them into the new contract.
- When writing new data, store in the new structure first.

### Fallback behavior

Fallback must not be a “different feature.” It is a provider choice.

Rules:

- If the upstream provider fails before task creation, switch to local fallback.
- If task polling fails, keep the user on the same task and show a recoverable error.
- If audio is missing remotely, use local audio or a local placeholder only through the same result model.

### Community compatibility

Community should not care whether a work came from upstream or fallback.

It only needs:

- published status
- display metadata
- audio source
- caption and emoji when available

## Error Handling

- Network failure: fall back to local provider if possible.
- Invalid upstream payload: treat as provider failure and keep the local path available.
- Missing audio/result: show a graceful empty or placeholder state instead of breaking the page.
- Corrupted legacy storage: ignore the invalid record and keep the rest.

## Implementation Sequence

1. Extract shared workshop types and provider interface.
2. Add the local fallback provider on top of the new contract.
3. Add the upstream-compatible provider and normalizer.
4. Refactor workshop page to use provider output only.
5. Refactor community page to consume the normalized published-work shape.
6. Add legacy-read compatibility and verify old data still loads.
7. Keep the current local-first behavior as the fallback, not as a separate code path.

## Testing Expectations

- Draft data still loads after refresh.
- Workshop generation works with local fallback.
- Workshop generation works with upstream-compatible task data.
- Published works appear in community from both sources.
- Legacy localStorage data still reads successfully.
- Provider failure does not crash the workshop page.

## Acceptance Criteria

- One normalized workshop model is used by workshop and community.
- The upstream-compatible flow is the primary path.
- The local fallback is preserved but adapted to the same model.
- Existing guest/local data is not lost.
- The UI can move toward a real backend later without redoing the page model.

## Notes For Later Backend Work

This design is intentionally backend-agnostic. It should remain compatible with:

- Cloudflare Workers
- Cloudflare D1 / Hyperdrive / PostgreSQL
- Alibaba Cloud Function Compute
- any later auth or storage upgrade

The point is to stabilize the front-end contract first, then swap providers and backends behind it.
