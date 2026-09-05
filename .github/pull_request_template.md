## What and why

<!-- One paragraph. Link the Linear issue (GDHUB-NN) or the intent doc. -->

## How to verify

<!-- The steps a reviewer (human or agent) follows to see it working. -->

## Checklist

- [ ] `bun run lint && bun run type-check && bun run test` pass locally
- [ ] Tests cover the change (API or domain logic changes need one)
- [ ] No hard-coded colours, radii or control heights — tokens or `var(--gd-*)`
- [ ] User-facing strings are Tolgee keys, `bun run refresh-translations` ran
- [ ] `.env.example` updated if a new variable was added
