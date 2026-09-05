#!/usr/bin/env sh
# Several GitHub and Linear accounts live on this machine, and the wrong one fails
# quietly: GitHub answers 404 for a repository the token cannot see — indistinguishable
# from a typo — and Linear would simply write into the other workspace.

GITHUB_LOGIN="dmitrydrynov"
LINEAR_WHO="dmitry.drynov (workspace GDHub, team GDHUB)"

input=$(cat)
tool=$(printf '%s' "$input" | jq -r '.tool_name // empty')

decide() {
	printf '%s' "$input" | jq -nc \
		--arg decision "$1" --arg reason "$2" \
		'{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: $decision, permissionDecisionReason: $reason}}'
	exit 0
}

case "$tool" in
Bash)
	cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
	printf '%s' "$cmd" | grep -qE '(^|[;&|(][[:space:]]*)(gh|git[[:space:]]+push)[[:space:]]' || exit 0

	command -v gh >/dev/null 2>&1 || exit 0
	login=$(gh api user --jq .login 2>/dev/null)
	[ -z "$login" ] && exit 0
	[ "$login" = "$GITHUB_LOGIN" ] && exit 0

	decide deny "gh is signed in as '$login', not '$GITHUB_LOGIN'. This repository belongs to gdhub-io, which that account cannot see — GitHub answers 404 rather than a permission error, so the failure will look like a missing resource. Switch first: gh auth switch --hostname github.com --user $GITHUB_LOGIN"
	;;
mcp__claude_ai_Linear__*)
	decide ask "This writes to Linear as whichever account authorised the connector. It must be $LINEAR_WHO. If that has not been confirmed with get_user(\"me\") in this session, cancel and confirm first — a write to the wrong workspace is not undone by retrying."
	;;
esac

exit 0
