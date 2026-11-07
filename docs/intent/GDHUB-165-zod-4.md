# GDHUB-165 — Move validation to zod 4

[Linear](https://linear.app/gdhub/issue/GDHUB-165/security-migrate-zod-3-to-zod-4-memory-exhaustion-advisory) · intent written 2026-11-08

## Want

Nothing visible changes for a person using GDHub. Every form and every API
request is checked by the same rules and answers in the same way. The difference
is underneath: an oversized request can no longer make the server run out of
memory while it is being validated.

## Why now

Dependabot reports a high-severity advisory on `zod`: validating an oversized
constrained collection can exhaust memory. Every version below 4.6.6 is affected,
and the 3.x line will not get a fix. The app is on 3.25.76, and every API route
validates its input with zod through `withValidation`, so any client can reach the
weak spot. It is the last of the 12 alerts GDHUB-164 left open.

## Constraints

- **The rules do not change.** No schema gets looser or stricter in this work. A
  request that passes today passes after, and one that fails still fails.
- **API validation errors keep their shape:** `400 { error: "Validation failed",
  statusCode, details }`, with `details` in the shape `.format()` gives today
  (`z.formatError` in zod 4). No client reads `details` today, but the shape is
  part of the API. The wording of zod's default messages may change.
- **AI structured output keeps working.** Three features pass zod schemas to the
  AI SDK `Output.object`: the AI review, the call notes and the evidence judge.
  `ai` 7 accepts zod 4 natively. What can change is the JSON Schema sent to the
  model (optional and nullable fields), and that has to be checked.
- **LLM cassettes are unaffected.** They key on the model and the prompt text
  (`ai-validation`), or on the prompt and response format (`aiModel`). No cassette
  exists for an `Output.object` call, so nothing needs re-recording.
- `zod-to-json-schema` is declared in `package.json` and imported nowhere. It
  does not support zod 4 and is removed.

## Done when

- [ ] `zod` is 4.6.6 or later, and the zod Dependabot alert is closed.
- [ ] Every form that validates on the client accepts and rejects the same input
      as before (profile, project and event settings, onboarding).
- [ ] An API route given an invalid body answers 400 with `details` in the same
      shape as before.
- [ ] The AI review, the call notes and the evidence judge still return parsed
      objects, and the JSON Schema they send differs from today's only in ways
      that were checked.
- [ ] Lint, type-check, unit tests and the e2e smoke suite pass on the built stand.

## How to check it on the platform

- **Form:** sign in on `/dev-signin` as `author`. Open Project → Settings →
  General, clear the name and save: the same error appears as before. A valid
  save still works.
- **API:** `PUT /api/user/project/link` with body `{"id": 1}` (wrong type),
  signed in. Expect `400 { "error": "Validation failed", "details": { "_errors":
  [], "id": { "_errors": [...] } } }`.
- **AI:** run the unit tests that cover the AI review, call notes and judge
  schemas. Compare the JSON Schema each produces under zod 3 and zod 4, and keep
  the diff in the PR description.

## Out of scope

- Rewriting schemas to use new zod 4 features (`z.email()`, `z.interface`, codecs).
  Only what zod 4 deprecates or breaks gets touched.
- A general request body size limit. It is a separate hardening step and is
  worth its own issue.
- `@gdhub-io/gdhub-prisma` and other sibling packages. They do not depend on zod.

## Open questions

- *Should deprecated-but-working calls (`.format()`, `z.nativeEnum`, string
  formats like `.email()`) be rewritten now?* Assumed: only where zod 4 removed or
  changed them; the rest stay, so the diff is the upgrade and nothing else.
- *Do the three AI schemas send a different JSON Schema under zod 4?* Assumed:
  possibly, for optional fields. It gets compared, and if the model's answers
  could change, it is fixed in the schema, not by pinning an old converter.
