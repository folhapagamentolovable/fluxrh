# FluxPay2 initial development plan

## Goal

Prepare FluxPay2 for incremental development as an automated, exception-oriented HR operations ERP without changing current behavior and without designing the new database yet.

## Repository baseline (2026-08-24)

### Current stack

- React 19 + TypeScript 5.8, bundled by Vite 6 with SWC.
- React Router 7 using hash routing.
- Tailwind CSS is present with both v3 and v4 packages; styling also includes a large root `index.css`.
- Supabase JS 2 is used directly throughout the UI for Auth, Data API, RPC, Realtime, and Edge Functions.
- PWA support uses `vite-plugin-pwa` and Workbox.
- Capacitor 8 provides Android/iOS wrappers plus camera and geolocation plugins.
- Lovable integration remains active through `lovable-tagger`, preview-host handling, repository sync documentation, and the hosted Lovable app.
- npm and Bun lockfiles coexist. CI will use npm because `package-lock.json` is current and the repository's documented setup uses npm.

### Structure and configuration findings

- The main shell, navigation, and a large route table are concentrated in root `App.tsx`.
- Product code is spread across root `components/`, `contexts/`, `hooks/`, `pages/`, `utils/`, and a smaller `src/` integration directory.
- There are 200+ TypeScript/TSX files and widespread `any` usage, so strictness should increase incrementally rather than through a flag-day rewrite.
- Existing scripts include only development, build, preview, and a development-mode build. No formal lint or test runner is configured.
- Test/debug scripts exist in several folders but are not connected to a repeatable test command.
- No GitHub Actions workflow existed at baseline.
- Production build succeeds and emits a roughly 4.56 MB main JavaScript chunk (about 1.18 MB gzip), with code-splitting warnings. After artifact generation, the observed local build process required interruption; investigate separately before tightening CI timeouts.

### Git and environments

- Baseline branch: `main`, tracking `origin/main`, with no reported working-tree changes before this setup.
- Origin: GitHub repository `folhapagamentolovable/fluxpay2`.
- The baseline had a tracked, empty `.env`; this setup removes it from version control and keeps only documented examples.
- New development and production example files define explicit environment intent. Real values must remain local or in the deployment platform.
- The browser client currently contains a fixed Supabase project URL and public anon key instead of consuming the environment contract. This setup records the debt but does not change runtime behavior.

### Supabase integration map

- Project linkage is stored in `supabase/config.toml`.
- Two migration collections exist: `supabase/migrations/` and root `migrations/`. Neither is changed in this phase.
- Edge Functions live under `supabase/functions/`; several have `verify_jwt = false` in config and need a future threat-model review.
- A singleton client is implemented in `lib/supabase.ts` and re-exported by `src/integrations/supabase/client.ts`.
- Generated-looking database types exist under `src/integrations/supabase/types.ts`, while additional hand-written models remain in `lib/supabase.ts`.
- Supabase is coupled directly to many components and hooks. Future work should introduce application-facing ports incrementally, not rewrite all data access at once.
- Relevant platform change to account for later: new Supabase tables are no longer automatically exposed to Data/GraphQL APIs by default. Database design must explicitly choose API exposure and grants.

## Safe setup decisions

1. Node.js 22 + npm is the supported local/CI runtime.
2. `package-lock.json` is authoritative; do not update both package managers in one change.
3. CI starts with deterministic install, TypeScript verification, and a production build.
4. Formatting and file hygiene are standardized with `.editorconfig`.
5. Environment files are ignored by default; only documented examples are committed.
6. Existing runtime integration values are not refactored in this foundation change because that could alter deployed behavior.
7. Database work is explicitly deferred, including cleanup or consolidation of migrations.

## Target structure for new work

```text
src/
  app/
    AppShell.tsx
    navigation.ts
    routes.tsx
    providers.tsx
  components/
    operational-state/
    ui/
  domain/
    operations/
      operational-state.ts
      operational-item.ts
  features/
    operations-home/
      components/
      fixtures/
      operations-home.page.tsx
  integrations/
    supabase/
  styles/
```

This is a direction for new code. Do not move the whole legacy tree at once.

## Milestone 1: app shell and operational UX

Status: **complete for UX validation**. A responsive product shell is available at `#/operacao`, with primary navigation, a fixture-backed operational home, a dedicated exception center, and mock operational views for People, Time, Compensation, Processes, Analytics, Automation, FluxPay AI, and Settings. Shared state types, deterministic prioritization, summary tests, and route-level lazy loading remain in place. Existing legacy routes remain unchanged.

### Outcome

A responsive, accessible shell that makes the FluxPay2 operating model tangible using local fixtures only. It must not depend on a new database or mutate current Supabase data.

### Scope

- [x] Extract a new app-shell layout without replacing existing routes in one step.
- [x] Define the shared operational states: normal, attention, decision, critical.
- [x] Create an operations home prototype with:
  - daily processing summary;
  - attention queue ordered by severity and age;
  - exception cards with evidence, recommendation, owner, deadline, and next action;
  - recent automation/audit activity;
  - empty, loading, degraded, and offline states.
- [x] Put typed local fixture data behind a small repository interface so persistence can be attached later.
- [x] Establish accessible navigation for RH/DP first while keeping room for collaborator, leader, finance, and executive views.
- [x] Add route-level lazy loading for the new shell to avoid increasing the oversized main bundle.

### Explicitly out of scope

- New tables, migrations, RLS, triggers, cron jobs, queues, or Edge Functions.
- Replacing existing payroll, timekeeping, vacation, portal, or rounds functionality.
- Connecting prototype actions to production data.
- Broad visual restyling of legacy screens.

### Acceptance criteria

- A user can understand what is normal and what needs action within one screen.
- Every exception shows why it was raised and what happens next.
- Severity is communicated by text/icon as well as color.
- Keyboard navigation and focus order are usable at desktop and mobile widths.
- Fixture-backed tests cover state ordering, counts, and primary user actions.
- Existing routes and behavior remain available.
- `npm run check` passes and the new route does not materially increase the initial bundle.

## Next foundation increments

1. Add Vitest + Testing Library for browser-level component tests; domain interaction tests now cover search, resolution, and selection handoff.
2. Add ESLint with a small, enforceable baseline; do not introduce hundreds of unrelated fixes in the setup change.
3. Add Prettier only after agreeing how it interacts with existing formatting and Lovable-generated commits.
4. Split route registration and navigation metadata out of `App.tsx`.
5. Create an architecture decision record for environment validation and removal of hard-coded Supabase values.
6. Audit Edge Function authentication and public data paths before any new backend capability.
7. Before the database phase, select one migration workflow/source of truth and design the tenant, authorization, audit, and exception lifecycle models.

## Risks to manage

- HR/payroll data is highly sensitive; authorization and auditability are product requirements, not later hardening.
- Direct browser-to-table access and disabled JWT verification enlarge the current attack surface.
- Duplicate migration locations make schema history ambiguous.
- The monolithic shell and large initial bundle make seemingly small UI changes risky.
- Lovable and local development can overwrite each other if changes are pushed directly to `main`; use small branches and pull requests for foundation work.
