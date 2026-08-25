# FluxPay2 engineering guide

## Product direction

FluxPay2 is an automated, exception-oriented HR operations ERP. The normal flow is:

`detect -> understand -> decide -> act -> verify -> audit`

Human attention is reserved for exceptions, approvals, risk, and judgment. Every operational experience must make the current state explicit: `normal`, `attention`, `decision`, or `critical`.

These principles govern product decisions:

- Automation first.
- Humans handle exceptions.
- Every operation starts from an event.
- Decisions are auditable.
- AI proposes and rules guarantee.
- Autonomy is graduated by risk.

## Current phase

The current milestone is the application shell and operational UX. Do not create or redesign the database yet. Do not add migrations, tables, policies, functions, seeds, or remote Supabase changes unless a later task explicitly authorizes the database phase.

Preserve existing product behavior while the new foundation is introduced incrementally.

## Architecture boundaries

- Keep UI, application/domain logic, and external integrations separate.
- New product work should live under `src/` and use the `@/` alias.
- Prefer feature folders for new flows: `src/features/<feature>/`.
- Put shared visual primitives in `src/components/` and app-shell concerns in `src/app/`.
- Put product concepts and pure rules in `src/domain/`; they must not import React or Supabase.
- Put Supabase and other external clients behind `src/integrations/`.
- Do not expand the root `App.tsx`; extract new routes, navigation, and layouts into `src/app/`.
- Treat the existing root-level `components/`, `hooks/`, `pages/`, and `utils/` as legacy boundaries to migrate gradually, not in broad rewrites.

## Coding standards

- Use TypeScript for new code. Avoid adding `any`; model unknown input with `unknown` and validate it.
- Prefer small, pure functions and explicit return types at integration and domain boundaries.
- Use named exports for reusable modules; route-level components may use default exports.
- Keep UI copy in Brazilian Portuguese and code identifiers in English unless an established domain term is clearer in Portuguese.
- Model operational state with a single shared union rather than ad hoc colors or labels.
- Keep accessibility in the definition of done: keyboard operation, visible focus, semantic labels, sufficient contrast, and reduced-motion support.
- Never log employee personal data, payroll values, tokens, or credentials.

## Environment and secrets

- Use Node.js 22 and npm. `package-lock.json` is the authoritative lockfile for CI.
- Local variables belong in `.env.development`; deployment variables belong in the hosting platform.
- Only commit `*.example` environment files.
- Every `VITE_` variable is public in the browser bundle. Never put service-role or secret keys in a `VITE_` variable.
- Do not add new hard-coded project URLs or keys. Existing hard-coded integration values are technical debt to remove in a dedicated, verified change.

## Supabase guardrails

- Do not connect CI or tests to the production Supabase project.
- Do not edit or replay either migration directory during the current phase.
- Before future database work, choose one migration source of truth and document whether the project uses an imperative or declarative workflow.
- Future exposed tables require intentional API grants and row-level security policies.
- Edge Functions that bypass JWT verification require an explicit threat-model review before further use.

## Verification

Run before handing off a change:

```sh
npm run check
```

For product behavior, add focused automated tests once the test runner is introduced. Until then, document the manual scenario exercised. Never make a failing check pass by weakening types, removing assertions, or hiding errors.

## Change discipline

- Keep changes small and reversible.
- Do not mix cleanup with product behavior in the same change.
- Do not delete legacy flows until replacement behavior has explicit acceptance criteria and regression coverage.
- Update `docs/FLUXPAY2_DEVELOPMENT_PLAN.md` when a foundation milestone or architectural decision changes.
