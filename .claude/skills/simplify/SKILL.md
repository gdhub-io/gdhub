---
name: simplify
description: Re-read a diff before it becomes a pull request and delete what does not need to be there — state a library already keeps, helpers used once, options nothing passes, branches nothing reaches, comments that restate their code. Use before opening a PR, or when asked to simplify.
---

# Simplify before anyone is asked to read it

The pass that never happens on its own. Writing code is additive: every
uncertainty leaves behind a variable, a branch or a comment, and none of them
remove themselves. This is the step that takes them out, and it runs **before**
the pull request, not after review asks for it.

Argument: nothing (the current diff), or a path.

## 1. Look at what you actually changed

```
git diff dev...HEAD --stat
git diff dev...HEAD
```

Read it as a reviewer who has never seen the task. Not "what is missing" — that
is the previous pass. **What can go.**

## 2. What to look for, in the order it pays

- **State a library already keeps.** Pages accumulated in a `useState` where
  `useInfiniteQuery` exists. A `useEffect` mirroring a prop into state. A
  `useMemo` around something cheap. Caching a value the query client caches.
- **A helper used once.** Inline it. A name is only worth it when it is reused
  or when the name is the explanation.
- **Options nothing passes, branches nothing reaches.** A parameter every caller
  omits, a `variant` with one value, a defensive `if` for a case the types
  exclude. Speculative structure is the thing this repo's conventions name first.
- **Two functions the same shape with one value different.** Either one function
  with a parameter, or leave both and say why they stay apart.
- **Derived state that could be computed.** If it can be read from what you
  already have, it should not also be stored.
- **Comments that restate their code.** One line each, and only what the code
  cannot say.
- **Hand-rolled markup antd ships.** `List`, `Card`, `Tag`, `Segmented`, `Modal`.
  A bespoke anatomy from the design file stays — and says which frame.

## 3. Do not simplify these away

- A comment carrying a *why* — the alternative that was tried, the trap avoided.
- A guard protecting a boundary: the `where` that scopes one user's rows, a
  status transition that must refuse.
- A test. Fewer assertions is not a simpler diff, it is a thinner one.
- Explicitness that is load-bearing: a named constant read by two files, a type
  that makes a wrong call fail to compile.

## 4. Prove nothing broke

```
bun run lint && bun run type-check && bun run test
```

## 5. Report what came out

Name the removals and the line count, or say plainly that nothing came out —
which is a real answer, and a better one than a cosmetic change made to look
busy.
