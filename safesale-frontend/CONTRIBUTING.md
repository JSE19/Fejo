# Contributing to SafeSale

Thanks for working on SafeSale. This doc covers branching, commits, code review, and the test gate.

## Branches

- **`main`** — stable, deployable, protected. Never push directly.
- **`frontend`** — active frontend work, owned by the frontend team.
- **`backend`** — active backend work, owned by the backend team.
- **Feature branches** — `<area>/<short-slug>` off `frontend` or `backend`. Examples:
  - `frontend/cashu-checkout`
  - `backend/bitnob-webhook`
  - `frontend/seller-onboarding-redesign`

Merge feature branches into `frontend` / `backend` via PR. Merge `frontend` / `backend` into `main` via PR, usually at the end of a working chunk that the other side can rely on.

## Commits

Use conventional-ish commit messages:

```
feat(scope): short summary in present tense
fix(scope): ...
chore(scope): ...
refactor(scope): ...
docs(scope): ...
test(scope): ...
```

Examples:

- `feat(checkout): add Cashu P2PK locking for buyer escrow token`
- `fix(timeline): allow "active" state on TimelineStep`
- `docs(nip): document kind 33889 dispute resolution event`
- `chore(deps): upgrade @cashu/cashu-ts to 2.6.0`

**Keep commits small.** One logical change per commit. If your message needs the word "and", split it.

**Do not add AI co-author footers** or generated-by signatures. Every commit must be authored by a human team member.

## Pull requests

1. Push your feature branch.
2. Open a PR against `frontend` or `backend` (not `main`).
3. PR title follows the same conventional format.
4. PR description includes:
   - **What** changed (1-2 sentences)
   - **Why** (link the PRD section or GitHub issue)
   - **How to test** (manual steps, or "ran `npm test`")
   - **Screenshots** for UI changes
5. At least one reviewer must approve before merge.
6. Squash-merge unless the branch has 3+ commits that genuinely tell a story.

## The test gate (frontend)

Before pushing, run:

```bash
npm test
```

This runs: TypeScript type-check → ESLint → Vitest → Vite build. **All four must pass.** No exceptions, no `--no-verify`. If a test is wrong, fix the test in the same PR.

## The test gate (backend)

To be defined by the backend team in `backend/README.md`. At minimum: type-check, lint, integration tests against a local PostgreSQL.

## Code style

- TypeScript strict mode on; no `any` (use `unknown` and narrow).
- Tailwind classes inline. No styled-components, no CSS modules.
- Hooks for shared logic. Components small and composable.
- File naming: `PascalCase.tsx` for components, `camelCase.ts` for utilities, `useCamelCase.ts` for hooks.

## Security checklist for every PR touching user-controlled data

- [ ] Sanitize all URLs with `sanitizeUrl()` before rendering or using in CSS.
- [ ] Sanitize any string going into `style={{ ... }}`.
- [ ] If filtering Nostr events for a trust-sensitive query (admin, mediator, escrow service), filter by `authors:` against the known pubkey allowlist.
- [ ] Never log Cashu tokens, nsecs, NIP-04/44 plaintexts, or PII.
- [ ] Never put secrets in `.env.example` — only placeholders.

## Reporting issues

Open a GitHub Issue with:

- **Title**: short and specific
- **Steps to reproduce** (if it's a bug)
- **Expected vs actual** behavior
- **Browser + OS** (if it's UI)
- **Screenshot or log** when relevant

For security issues, do not open a public issue. Email the team lead directly.
