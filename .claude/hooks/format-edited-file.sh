#!/usr/bin/env sh
# Formats the file Claude just wrote. Biome's rules land immediately instead of
# at commit time, so the agent never reads back code it will have to reformat.

file=$(jq -r '.tool_input.file_path // empty')
[ -n "$file" ] || exit 0
[ -f "$file" ] || exit 0

case "$file" in
	*.ts | *.tsx | *.js | *.jsx | *.mjs | *.json) ;;
	*) exit 0 ;;
esac

biome="${CLAUDE_PROJECT_DIR:-.}/node_modules/.bin/biome"
[ -x "$biome" ] || exit 0

"$biome" check --write --no-errors-on-unmatched "$file" >/dev/null 2>&1 || true
exit 0
