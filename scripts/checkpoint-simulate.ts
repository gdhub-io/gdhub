/**
 * Dev only: one AI checkpoint lived from day 1 to its verdict in a few minutes
 * (GDHUB-120), to read what the admin's curator journal makes of a whole run.
 *
 * It starts a new AI checkpoint on the project — as an administrator gives one,
 * without payment — and walks its 29 days: each day everything of this
 * checkpoint (its dates, letters, journal, and the artifacts and devlogs the
 * script posted) moves one day into the past, so today becomes the next day,
 * and the nightly cron runs as it would. The team acts on set days: tasks and
 * the plan on day 1, an artifact and a devlog each sprint, the pulse answered,
 * a task cut on day 15. Real model calls throughout (about $0.15), and real
 * letters to the project's people through the development Novu.
 *
 *   bun run checkpoint:simulate <projectSlug>
 *
 * Only this checkpoint's rows move; the cron touches every running checkpoint
 * of the database, so run it where no other one is running. Refuses any
 * database that is not on this machine.
 */
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
	ProjectArtifactType,
} from "@gdhub-io/gdhub-prisma";
import { MS_PER_DAY } from "@/lib/checkpoint-days";
import { sweepArtifactChecks } from "@/repositories/artifact-check";
import { writeDueVerdictReads } from "@/repositories/checkpoint-curator.repository";
import { startAiCheckpoint } from "@/repositories/checkpoint-payment";
import { approvePlan, changePlan } from "@/repositories/checkpoint-plan-edit";
import { requestPulses } from "@/repositories/checkpoint-pulse";
import {
	adviseOnPlan,
	writeDueBriefs,
	writeDueReviews,
} from "@/repositories/checkpoint-review";
import { moveFinishedToReview } from "@/repositories/checkpoint-verdict.repository";
import { getJournalView } from "@/repositories/curator-journal-view";
import { CONFIRMED_MEMBERS } from "@/repositories/scout.games";
import {
	remindDevlogsDue,
	remindEvidenceDue,
	remindVerdictsDue,
} from "@/services/checkpoint-notifications";
import { prisma } from "@/services/prisma";
import { announceDbTarget } from "./_db-target";

const IMAGE =
	"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_big.jpg/960px-Fronalpstock_big.jpg";
const VIDEO = "https://www.youtube.com/watch?v=aqz-KE-bpKQ";

const GOAL = "A playable vertical slice of the first island";
const INPUT = "A concept document and a paper map of the island";
const TASKS = [
	"A public repository of the Godot demo projects the game builds on",
	"An animated reference video for the art style",
	"A reference article on what playtesting is, for the team to read",
	"A storyboard for the trailer",
];

const [slug] = process.argv.slice(2);
if (!slug) {
	console.error("Usage: bun run checkpoint:simulate <projectSlug>");
	process.exit(1);
}
const host = new URL(process.env.DATABASE_URL ?? "postgres://x").hostname;
if (host !== "localhost" && host !== "127.0.0.1") {
	console.error(`Refusing to touch ${host}: this script is for a local database only.`);
	process.exit(1);
}
announceDbTarget(`Simulating a whole AI checkpoint on ${slug}`);

const project = await prisma.project.findUniqueOrThrow({
	where: { slug },
	select: {
		id: true,
		authorId: true,
		workflow: { select: { currentStep: { select: { id: true, name: true } } } },
		team: {
			select: { members: { where: CONFIRMED_MEMBERS, select: { userId: true } } },
		},
		checkpoints: {
			where: { status: { notIn: [CheckpointStatus.Closed, CheckpointStatus.Cancelled] } },
			select: { id: true },
		},
	},
});
const step = project.workflow?.currentStep;
if (!step || project.checkpoints.length) {
	console.error("The project needs a current stage and no checkpoint under way.");
	process.exit(1);
}
const author = project.authorId;
const member =
	project.team?.members.find((row) => row.userId !== author)?.userId ?? author;

const { id } = await prisma.projectCheckpoint.create({
	data: {
		projectId: project.id,
		stepId: step.id,
		stageName: step.name,
		order: (await prisma.projectCheckpoint.count({ where: { stepId: step.id } })) + 1,
		curatorKind: CheckpointCuratorKind.AI,
		goal: GOAL,
		items: {
			create: [{ kind: CheckpointItemKind.Input, order: 0, text: INPUT }],
		},
	},
	select: { id: true },
});
console.info(`Checkpoint ${id}`);

const posted = { artifacts: [] as string[], devlogs: [] as string[] };

/** Everything of this checkpoint one day further back: tomorrow becomes today. */
const nextDay = async () => {
	const back = (table: string, columns: string[], where: string) =>
		prisma.$executeRawUnsafe(
			`UPDATE "${table}" SET ${columns.map((c) => `"${c}" = "${c}" - interval '1 day'`).join(", ")} WHERE ${where}`,
			id,
		);
	await back(
		"ProjectCheckpoint",
		["startedAt", "dueAt", "decidedAt", "goalAgreedAt", "planCheckedAt", "scopeConfirmedAt", "createdAt"],
		`"id" = $1`,
	);
	await back("CheckpointSession", ["scheduledAt", "endedAt", "createdAt"], `"checkpointId" = $1`);
	await back("CheckpointPulse", ["requestedAt", "confirmedAt"], `"checkpointId" = $1`);
	await back("CheckpointItem", ["addedAt"], `"checkpointId" = $1`);
	await back("CheckpointJournalEntry", ["createdAt"], `"checkpointId" = $1`);
	await back("CheckpointAiUsage", ["createdAt"], `"checkpointId" = $1`);
	if (posted.artifacts.length) {
		await prisma.$executeRawUnsafe(
			`UPDATE "ProjectArtifact" SET "createdAt" = "createdAt" - interval '1 day' WHERE "id" = ANY($1)`,
			posted.artifacts,
		);
	}
	if (posted.devlogs.length) {
		await prisma.$executeRawUnsafe(
			`UPDATE "ProjectReport" SET "publishedAt" = "publishedAt" - interval '1 day' WHERE "id" = ANY($1)`,
			posted.devlogs,
		);
	}
};

/** The nightly run, in the order /api/cron/checkpoints runs it. */
const nightly = async () => {
	await moveFinishedToReview();
	await remindDevlogsDue();
	await remindEvidenceDue();
	await remindVerdictsDue();
	await requestPulses();
	await sweepArtifactChecks();
	const reviews = await writeDueReviews();
	await writeDueBriefs();
	await writeDueVerdictReads();
	return reviews;
};

const artifact = async (
	by: string,
	type: ProjectArtifactType,
	name: string,
	link: string,
	task?: number,
) => {
	const row = await prisma.projectArtifact.create({
		data: { projectId: project.id, stepId: step.id, createdById: by, type, name, link },
		select: { id: true },
	});
	posted.artifacts.push(row.id);
	if (task !== undefined) {
		await prisma.checkpointItem.updateMany({
			where: { checkpointId: id, kind: CheckpointItemKind.Outcome, order: task },
			data: { artifactId: row.id },
		});
	}
};

const devlog = async (by: string, content: string, media: { image?: string; video?: string }) => {
	const last = await prisma.projectReport.aggregate({
		where: { projectId: project.id },
		_max: { number: true },
	});
	const row = await prisma.projectReport.create({
		data: {
			projectId: project.id,
			authorId: by,
			stepId: step.id,
			checkpointId: id,
			publishedAt: new Date(),
			number: (last._max.number ?? 0) + 1,
			content,
			video: media.video ?? null,
			contentEditor: media.image
				? { blocks: [{ type: "image", data: { file: { url: media.image } } }] }
				: undefined,
		},
		select: { id: true },
	});
	posted.devlogs.push(row.id);
};

const answerPulse = () =>
	prisma.checkpointPulse.updateMany({
		where: { checkpointId: id, confirmedAt: null },
		data: { confirmedAt: new Date(), source: "email" },
	});

/** What the team does on a day, after the night's run. */
const TEAM: Record<number, () => Promise<unknown>> = {
	3: async () => {
		await artifact(author, ProjectArtifactType.Other, "Godot demo projects", "https://github.com/godotengine/godot-demo-projects", 0);
		await devlog(author, "Week 1: the greybox of the island is in. You can walk from the beach to the lighthouse.", { image: IMAGE });
	},
	7: answerPulse,
	10: async () => {
		await artifact(member, ProjectArtifactType.GameplayVideo, "Art style reference", VIDEO, 1);
		await devlog(member, "Week 2: the art style reference is up, as a short animated video.", { video: VIDEO });
	},
	14: answerPulse,
	15: async () => {
		const storyboard = await prisma.checkpointItem.findFirstOrThrow({
			where: { checkpointId: id, kind: CheckpointItemKind.Outcome, order: 3 },
			select: { id: true },
		});
		console.info("  cut the storyboard:", (await changePlan(id, author, { op: "remove", itemId: storyboard.id })) ?? "ok");
		console.info("  tasks confirmed:", (await approvePlan(id, author)) ?? "ok");
	},
	18: async () => {
		await artifact(author, ProjectArtifactType.Other, "How we playtest", "https://en.wikipedia.org/wiki/Playtest", 2);
		await artifact(author, ProjectArtifactType.GameplayVideo, "Build video, sprint 3", VIDEO);
		await devlog(author, "Week 3: we read up on playtesting and recorded the current build.", {});
	},
	21: answerPulse,
	25: () => devlog(author, "Week 4: everything is in; the island is ready for the demo stage.", {}),
	28: answerPulse,
};

// Day 1: the checkpoint starts, the curator writes, the author sends the tasks and approves.
await startAiCheckpoint(id, null);
for (let tries = 0; tries < 60; tries++) {
	const first = await prisma.checkpointSession.findFirst({
		where: { checkpointId: id, index: 1 },
		select: { content: true },
	});
	if (first?.content) break;
	await new Promise((resolve) => setTimeout(resolve, 2000));
}
await prisma.checkpointItem.createMany({
	data: TASKS.map((text, order) => ({ checkpointId: id, kind: CheckpointItemKind.Outcome, order, text })),
});
console.info("Day 1: tasks checked:", (await adviseOnPlan(id, author)) ?? "ok");
console.info("Day 1: plan approved:", (await approvePlan(id, author)) ?? "ok");

for (let day = 2; day <= 29; day++) {
	await nextDay();
	const reviews = await nightly();
	await TEAM[day]?.();
	console.info(`Day ${day}${reviews ? ` · ${reviews} review written` : ""}`);
}

const view = await getJournalView(id);
const count = new Map<string, number>();
for (const message of view?.messages ?? []) {
	const key = `${message.side} ${message.kind}${message.variant ? `/${message.variant}` : ""}`;
	count.set(key, (count.get(key) ?? 0) + 1);
}
console.info("\nThe journal, by side and kind:");
for (const [key, n] of [...count].sort()) console.info(`  ${key}: ${n}`);
const closed = await prisma.projectCheckpoint.findUniqueOrThrow({
	where: { id },
	select: { status: true, verdict: true },
});
console.info(`\n${closed.status} · ${closed.verdict ?? "no verdict"} — open Admin → Checkpoints → Curator journal.`);
process.exit(0);
