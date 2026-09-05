#!/usr/bin/env sh
# Stop gate: a session does not end on code Biome rejects. CI runs the same
# check on the PR; this makes it fail in milliseconds instead of minutes.

input=$(cat)
# Claude already came back once to fix this — do not hold it a second time.
[ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false')" = "true" ] && exit 0

root="${CLAUDE_PROJECT_DIR:-.}"
biome="$root/node_modules/.bin/biome"
[ -x "$biome" ] || exit 0

if ! out=$("$biome" check --diagnostic-level=error "$root/src" "$root/tests" "$root/scripts" 2>&1); then
	printf 'Biome rejects the current tree — fix these before finishing:\n\n%s\n' "$out" >&2
	exit 2
fi
exit 0
