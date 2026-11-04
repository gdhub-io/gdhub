#!/bin/sh
# Runs a command (an e2e run) at low priority and watches the machine while it
# does: every 10s it logs the load and the busiest processes, and stops the run
# when the machine starts to choke, so a run can never hang the computer:
#   - the 1-minute load above E2E_LOAD_LIMIT (default 20) for three samples,
#   - free memory under 15%,
#   - the stand on :3100 holding more than E2E_STAND_MB (default 6000).
#   scripts/e2e-watchdog.sh <log> <command...>

LOG="$1"
shift
LIMIT="${E2E_LOAD_LIMIT:-20}"

nice -n 15 "$@" &
RUN=$!

stop() {
	echo "=== $1: stopping the run" >>"$LOG"
	pkill -P "$RUN"
	kill "$RUN"
	pkill -f "playwright test"
	exit 99
}

high=0
while kill -0 "$RUN" 2>/dev/null; do
	LOAD=$(sysctl -n vm.loadavg | awk '{print $2}')
	FREE=$(memory_pressure | awk -F': ' '/free percentage/ {print $2}' | tr -d '%')
	# The stand's footprint, compressed and swapped memory included (top's MEM).
	STAND=$(lsof -ti "tcp:${E2E_STAND_PORT:-3100}" -sTCP:LISTEN | head -1)
	STAND_MB=0
	[ -n "$STAND" ] && STAND_MB=$(top -l 1 -pid "$STAND" -stats mem | tail -1 |
		awk '/G/ {sub("G[+-]?",""); print int($1 * 1024); next} /M/ {sub("M[+-]?",""); print int($1); next} {print 0}')
	{
		echo "=== $(date +%H:%M:%S) load $LOAD free $FREE% stand ${STAND_MB}MB"
		ps -Ao pcpu,rss,comm -r | head -9
	} >>"$LOG"

	if [ "$(echo "$LOAD > $LIMIT" | bc)" = 1 ]; then high=$((high + 1)); else high=0; fi
	[ "$high" -ge 3 ] && stop "load $LOAD over $LIMIT for 30s"
	[ "${FREE:-100}" -lt 15 ] && stop "free memory $FREE%"
	[ "$STAND_MB" -gt "${E2E_STAND_MB:-6000}" ] && stop "the stand holds ${STAND_MB}MB"
	sleep 10
done
wait "$RUN"
