/**
 * One-off cleanup of accumulated BullMQ job history.
 *
 * Queues created before `removeOnComplete`/`removeOnFail` were configured keep
 * every completed and failed job forever, which grows the Redis dataset without
 * bound. This script trims that backlog; new jobs are trimmed automatically by
 * the defaults in src/queues/*.queue.ts.
 *
 * Usage:
 *   bun run queues:clean -- --dry-run
 *   bun run queues:clean
 *   bun run queues:clean -- --queues telegram --completed-age 600
 *
 * Options:
 *   --dry-run              report counts and memory, remove nothing
 *   --queues a,b           queues to process (default: telegram,matching)
 *   --completed-age <sec>  keep completed jobs younger than this (default 3600)
 *   --failed-age <sec>     keep failed jobs younger than this (default 86400)
 *
 * Env: REDIS_URL
 */

import "dotenv/config";
import { Queue } from "bullmq";
import IORedis from "ioredis";

const args = process.argv.slice(2);

const flag = (name, fallback) => {
	const idx = args.indexOf(`--${name}`);
	return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
};

const dryRun = args.includes("--dry-run");
const queueNames = flag("queues", "telegram,matching")
	.split(",")
	.map((n) => n.trim())
	.filter(Boolean);
const completedGraceMs = Number(flag("completed-age", 3600)) * 1000;
const failedGraceMs = Number(flag("failed-age", 24 * 3600)) * 1000;

const CLEAN_BATCH = 1000;

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
	console.error("❌ REDIS_URL is not set");
	process.exit(1);
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const usedMemory = async () => {
	const info = await connection.info("memory");
	const match = info.match(/used_memory_human:(\S+)/);
	return match ? match[1] : "unknown";
};

/** clean() is capped per call, so loop until a pass removes nothing. */
const cleanAll = async (queue, graceMs, type) => {
	let removed = 0;

	for (;;) {
		const batch = await queue.clean(graceMs, CLEAN_BATCH, type);
		removed += batch.length;
		if (batch.length < CLEAN_BATCH) break;
	}

	return removed;
};

const main = async () => {
	console.log(`Redis memory before: ${await usedMemory()}`);
	if (dryRun) console.log("(dry run — nothing will be removed)\n");

	for (const name of queueNames) {
		const queue = new Queue(name, { connection });

		try {
			const before = await queue.getJobCounts(
				"completed",
				"failed",
				"wait",
				"active",
				"delayed",
			);
			console.log(`\n[${name}] before:`, before);

			if (dryRun) continue;

			const completed = await cleanAll(queue, completedGraceMs, "completed");
			const failed = await cleanAll(queue, failedGraceMs, "failed");
			console.log(`[${name}] removed: ${completed} completed, ${failed} failed`);

			const after = await queue.getJobCounts(
				"completed",
				"failed",
				"wait",
				"active",
				"delayed",
			);
			console.log(`[${name}] after:`, after);
		} finally {
			await queue.close();
		}
	}

	console.log(`\nRedis memory after: ${await usedMemory()}`);
	console.log(
		"Note: Redis does not always return freed pages to the OS immediately.",
	);
};

main()
	.catch((error) => {
		console.error("❌ Cleanup failed:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.quit();
	});
