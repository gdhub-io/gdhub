/**
 * Removes the LLM cassettes a full e2e run did not use: a recording is touched
 * whenever it answers, so anything older than the run's start is left over from
 * a prompt that no longer exists.
 *
 *   bun run cassettes:prune <ISO time the run started>
 */
import { readdirSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "tests/e2e/cassettes");
const since = new Date(process.argv[2] ?? "");
if (Number.isNaN(since.getTime())) {
	console.error("Pass the time the full run started, e.g. 2026-10-29T12:00:00Z");
	process.exit(1);
}

const stale = readdirSync(DIR).filter(
	(file) => statSync(path.join(DIR, file)).mtime < since,
);
for (const file of stale) unlinkSync(path.join(DIR, file));
console.log(`Removed ${stale.length} unused cassettes.`);
