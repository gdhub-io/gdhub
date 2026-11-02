#!/bin/sh
# Runs a command (an e2e run) and watches the machine while it does: every 10s
# it logs the load and the busiest processes, and stops the run if the
# 1-minute load passes the limit, so a run can never hang the computer.
#   scripts/e2e-watchdog.sh <log> <command...>
# E2E_LOAD_LIMIT (default 15) sets the limit.

LOG="$1"
shift
LIMIT="${E2E_LOAD_LIMIT:-15}"

"$@" &
RUN=$!

while kill -0 "$RUN" 2>/dev/null; do
	LOAD=$(sysctl -n vm.loadavg | awk '{print $2}')
	{
		echo "=== $(date +%H:%M:%S) load $LOAD"
		ps -Ao pcpu,rss,comm -r | head -9
	} >>"$LOG"
	if [ "$(echo "$LOAD > $LIMIT" | bc)" = 1 ]; then
		echo "=== load $LOAD over $LIMIT: stopping the run" >>"$LOG"
		pkill -P "$RUN"
		kill "$RUN"
		pkill -f "playwright test"
		exit 99
	fi
	sleep 10
done
wait "$RUN"
