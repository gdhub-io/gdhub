/**
 * Dev only: write an AI checkpoint's sprint review now instead of waiting for
 * its day (GDHUB-110). The checkpoint is moved back in time so that today is the
 * chosen sprint's last day — the devlogs and artifacts of the last seven days
 * fall into it — and the review is written by the same code the
 * nightly cron runs, real model calls included (a few cents a run).
 *
 *   bun run checkpoint:review <checkpointId> <sprint 1–4>
 *
 * Sprint 4 is the final review: it settles the verdict and closes the
 * checkpoint. Refuses any database that is not on this machine.
 */
import { CheckpointSessionContentStatus } from "@gdhub-io/gdhub-prisma";
import { writeReviewFor } from "@/repositories/checkpoint-review";
import { prisma } from "@/services/prisma";
import { announceDbTarget } from "./_db-target";

const DAY = 24 * 60 * 60 * 1000;

const [checkpointId, sprintArg] = process.argv.slice(2);
const sprint = Number(sprintArg);
if (!checkpointId || !(sprint >= 1 && sprint <= 4)) {
	console.error("Usage: bun run checkpoint:review <checkpointId> <sprint 1–4>");
	process.exit(1);
}

const host = new URL(process.env.DATABASE_URL ?? "postgres://x").hostname;
if (host !== "localhost" && host !== "127.0.0.1") {
	console.error(`Refusing to touch ${host}: this script is for a local database only.`);
	process.exit(1);
}
announceDbTarget(`Writing the sprint ${sprint} review of ${checkpointId}`);

const checkpoint = await prisma.projectCheckpoint.findUnique({
	where: { id: checkpointId },
	select: {
		curatorKind: true,
		status: true,
		startedAt: true,
		dueAt: true,
		sessions: { select: { id: true, index: true, scheduledAt: true } },
	},
});
if (!checkpoint?.startedAt || checkpoint.curatorKind !== "AI") {
	console.error("Not a started AI checkpoint.");
	process.exit(1);
}

// Today becomes the sprint's last day, so what was posted or attached today is
// part of it: the run started 7·sprint − 1 days ago.
const now = new Date();
const shift =
	now.getTime() - (sprint * 7 - 1) * DAY - checkpoint.startedAt.getTime();
const moved = (date: Date | null) =>
	date ? new Date(date.getTime() + shift) : null;

await prisma.projectCheckpoint.update({
	where: { id: checkpointId },
	data: {
		startedAt: moved(checkpoint.startedAt),
		dueAt: moved(checkpoint.dueAt),
	},
});
for (const session of checkpoint.sessions) {
	await prisma.checkpointSession.update({
		where: { id: session.id },
		data: { scheduledAt: moved(session.scheduledAt) ?? session.scheduledAt },
	});
}

const target = checkpoint.sessions.find((row) => row.index === sprint + 1);
if (!target) {
	console.error(`The checkpoint has no session ${sprint + 1}.`);
	process.exit(1);
}
await prisma.checkpointSession.update({
	where: { id: target.id },
	data: { contentStatus: CheckpointSessionContentStatus.Pending },
});

const ok = await writeReviewFor(target.id, now).catch((error) => {
	console.error(error);
	return false;
});
if (!ok) {
	await prisma.checkpointSession.update({
		where: { id: target.id },
		data: { contentStatus: null },
	});
	console.error("The review was not written (see above).");
	process.exit(1);
}

const [session, items] = await Promise.all([
	prisma.checkpointSession.findUnique({
		where: { id: target.id },
		select: { content: true },
	}),
	prisma.checkpointItem.findMany({
		where: { checkpointId, evidenceMatch: { not: null } },
		select: { text: true, evidenceMatch: true, evidenceMatchNote: true },
	}),
]);

console.info("\nWhat the curator saw in the evidence:");
for (const item of items) {
	console.info(`- ${item.text}: ${item.evidenceMatch} — ${item.evidenceMatchNote ?? ""}`);
}
console.info("\nThe review:");
console.info(JSON.stringify(session?.content, null, 2));
process.exit(0);
