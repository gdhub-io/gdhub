---
name: i18n
description: Add or change user-facing text through Tolgee — writing the key, pushing it to the server, pulling translations back. Use when a screen needs copy, when a key renders as its own name at runtime, or when translations look stale.
---

# Translations

`src/i18n/en.json` and `ru.json` are the only runtime source — they are handed to
Tolgee as `staticData` in `src/services/tolgee.ts`, with no CDN fetch — and they
are **generated**. `bun run refresh-translations` overwrites both from
tolgee.gdhub.io, and it runs on every push. **Editing them by hand is work that
disappears at the next push.** The server is the source of truth; the files are a
build artefact that happens to be committed.

## Adding a string

1. In the component: `const { t } = useTranslate();` then
   `t("namespace.thing.label", "English default")`. The second argument is what
   renders until the key exists on the server, so write real copy there, not a
   placeholder.
2. Push the new keys to Tolgee (see the env trap below).
3. `bun run refresh-translations` to pull them back into `src/i18n/`.
4. Commit the regenerated JSON with the code that needs it.

## The env trap

The Tolgee CLI reads `TOLGEE_API_KEY`. This project's `.env` only defines
`NEXT_PUBLIC_TOLGEE_API_KEY`, so every CLI call needs the mapping:

```sh
node_modules/.bin/dotenv -- sh -c \
  'TOLGEE_API_KEY="$NEXT_PUBLIC_TOLGEE_API_KEY" node_modules/.bin/tolgee push --force-mode KEEP'
```

`--force-mode KEEP` is not optional: it creates the keys that are new and leaves
every existing server translation alone. Without it a push overwrites work done
in the Tolgee UI.

## Never run `tolgee sync --remove-unused`

`tolgee compare` reports as unused every key that is assembled at runtime, and it
would delete them. 222 keys currently look unused and are not:

- 65 are built at runtime — `landing.feedback.*N`, `workDirection-*`,
  `workflow.<title>.stepN.name`, the `SkillLevel` enum values, `event.type.*`.
- 157 are legacy English-text keys that survive only as the inline default of a
  newer namespaced key.

A cleanup on 2026-07-30 already removed the 267 that were genuinely dead.

## Three keys that must stay out of Tolgee

`modal.vacancy.paymentNotice`, `page.onboardingError.description`,
`modal.speciality.title.create-with-invitation`. Their inline default is a
template literal, so a stored translation swallows the interpolation and the
value renders as literal text. Convert them to ICU parameters before pushing
them.

## When the server is unreachable

`scripts/import-translations.js` exits 0 on a 5xx so Tolgee being down does not
block a push, and exits 1 on a 4xx because that means a bad API key. A 429 is
rate limiting — wait it out rather than retrying in a loop; the MCP endpoint and
the export API share the budget.
