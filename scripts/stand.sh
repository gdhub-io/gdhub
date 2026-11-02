#!/bin/sh
# The e2e stand on :3100 against the throwaway database (`bun run test-env up`).
#   dev    next dev, recorded model answers: for working on one spec
#   live   next dev, the real model
#   build  the stand's own production build into .next-test (GDHUB-134)
#   start  serves that build: every e2e stage runs against it
# next dev holds every compiled route in memory (~200 MB a page), so a whole
# suite runs on the build; `build` again after the code changes.
set -e
cd "$(dirname "$0")/.."

STAND=http://localhost:3100

# Read in the browser too, so fixed into the bundle at build time.
export NEXT_PUBLIC_E2E_STAND=1
export NEXT_PUBLIC_DAILY_EMULATED=1
export NEXT_PUBLIC_EXPERT_CHECKPOINT_OPEN=1
export NEXT_PUBLIC_PADDLE_ENV=sandbox
export NEXT_PUBLIC_APP_URL=$STAND

export E2E_TEST_AUTH=1
export DAILY_EMULATED=1
export DAILY_WEBHOOK_SECRET=ZTJlLWRhaWx5LXNlY3JldA==
export CRON_SECRET=e2e-cron
export CHECKPOINTS_PURCHASE_OPEN=true
export LLM_CASSETTES=auto
export NEXT_DIST_DIR=.next-test
export NEXTAUTH_URL=$STAND
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/gdhub_test

# .env.test fills the rest (Paddle sandbox keys); the values above win.
run() {
	exec bunx dotenv -e .env.test -- "$@"
}

case "$1" in
dev) run next dev --turbopack -p 3100 ;;
live)
	unset LLM_CASSETTES
	run next dev --turbopack -p 3100
	;;
# NODE_ENV is set here, after dotenv: a development value from a file breaks the build.
build) NODE_ENV=production run next build --turbopack ;;
start) NODE_ENV=production run next start -p 3100 ;;
*)
	echo "usage: scripts/stand.sh dev|live|build|start" >&2
	exit 1
	;;
esac
