/**
 * Dev only: write an AI checkpoint's sprint review now instead of waiting for
 * its day (GDHUB-110) — or, on a human curator's checkpoint, the brief for the
 * call that opens the next sprint, and on sprint 4 the AI's read of the
 * verdict too (GDHUB-114). The checkpoint is moved back in time so that today
 * is the chosen sprint's last day — for an AI review, the day after, its own —
 * and the devlogs and artifacts of the last days fall into it; the review is
 * written by the same code the nightly cron runs, real model calls included
 * (a few cents a run).
 *
 *   bun run checkpoint:review <checkpointId> <sprint 1–4>
 *
 * Sprint 4 is the final review: it settles the verdict and closes the
 * checkpoint. Refuses any database that is not on this machine.
 */
import { CheckpointSessionContentStatus } from "@gdhub-io/gdhub-prisma";
import { SPRINT_DAYS } from "@/config/checkpoint";
import { MS_PER_DAY } from "@/lib/checkpoint-days";
import { writeVerdictRead } from "@/repositories/checkpoint-curator.repository";
import {
	writeBriefFor,
	writeReviewFor,
} from "@/repositories/checkpoint-review";
import { getJournal } from "@/repositories/curator-journal";
import { prisma } from "@/services/prisma";
import { announceDbTarget } from "./_db-target";


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
if (!checkpoint?.startedAt) {
	console.error("Not a started checkpoint.");
	process.exit(1);
}
const human = checkpoint.curatorKind === "Human";

// A brief is read the night before its call: today becomes the sprint's last
// day. An AI review lives on the next session's day, so today becomes that day
// and the page shows it; the sprint's window runs a day past its last, so what
// was posted or attached today is part of it either way.
const now = new Date();
const daysBack = human ? sprint * SPRINT_DAYS - 1 : sprint * SPRINT_DAYS;
const shift =
	now.getTime() - daysBack * MS_PER_DAY - checkpoint.startedAt.getTime();
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
if (human) {
	// The brief is written once: an earlier one for this call is replaced.
	await prisma.checkpointJournalEntry.deleteMany({
		where: { checkpointId, kind: "Review", sprint },
	});
	console.info(`Brief written: ${await writeBriefFor(target.id)}`);
	if (sprint === 4) {
		await prisma.checkpointJournalEntry.deleteMany({
			where: { checkpointId, kind: "Verdict" },
		});
		console.info(`Verdict read written: ${await writeVerdictRead(checkpointId)}`);
	}
} else {
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
}

const [session, entries] = await Promise.all([
	prisma.checkpointSession.findUnique({
		where: { id: target.id },
		select: { content: true },
	}),
	getJournal(checkpointId),
]);

// The whole journal, with its inputs, is in the admin's Curator journal drawer.
console.info("\nThe curator's journal, newest first:");
for (const entry of entries) {
	const read = entry.input as { unread?: string | null } | null;
	console.info(
		`- [sprint ${entry.sprint ?? "—"}] ${entry.kind}${entry.link ? ` ${entry.link}` : ""}`,
	);
	if (read?.unread) console.info(`    not read: ${read.unread}`);
	console.info(`    ${JSON.stringify(entry.output).slice(0, 400)}`);
}
console.info("\nThe review:");
console.info(JSON.stringify(session?.content, null, 2));
process.exit(0);
