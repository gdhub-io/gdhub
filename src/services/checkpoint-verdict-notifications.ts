import dayjs from "dayjs";
import { verdictDueBy } from "@/lib/checkpoint-verdict-window";
import { checkpointNumber } from "@/repositories/checkpoint-number";
import { appUrl, notify } from "./checkpoint-notifications";
import { prisma } from "./prisma";

/**
 * The two letters around a human curator's verdict, each to the bell and by
 * email with the same link (frame `Yfr1j`). A failure is logged and swallowed:
 * neither the move to Review nor the verdict waits on Novu.
 */

/** The 28 days are over: the curator is told what is due and by when. */
export const notifyVerdictDue = async (checkpointIds: string[]) => {
	if (!checkpointIds.length) return;

	const rows = await prisma.projectCheckpoint.findMany({
		where: { id: { in: checkpointIds }, curatorId: { not: null } },
		select: {
			id: true,
			projectId: true,
			createdAt: true,
			dueAt: true,
			project: { select: { name: true } },
			curator: { select: { id: true, email: true } },
		},
	});

	await Promise.all(
		rows.map(async (row) => {
			if (!row.curator || !row.dueAt) return;
			const due = dayjs(verdictDueBy(row.dueAt)).format("D MMM");
			const number = await checkpointNumber(row);

			return notify(row.curator, `cp-verdict-due-${row.id}`, {
				checkpointId: row.id,
				title: `Your verdict on ${row.project.name} is due by ${due}`,
				message: `Checkpoint ${number} has ended. Talk it through on the final call; you can send the verdict once the call starts, by ${due}.`,
				redirectUrl: `${appUrl()}/advisor/checkpoints?verdict=${row.id}`,
			});
		}),
	);
};

const VERDICT_LABEL = {
	StageClosed: "Ready for the next stage",
	GoalMet: "Goal met",
	GoalMissed: "Goal missed",
} as const;

/** The verdict is in: the project's author is told and sent to read it. */
export const notifyVerdictSent = async (checkpointId: string) => {
	const row = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			id: true,
			projectId: true,
			createdAt: true,
			verdict: true,
			curatorId: true,
			decidedById: true,
			curator: { select: { name: true } },
			project: {
				select: {
					slug: true,
					author: { select: { id: true, email: true } },
				},
			},
		},
	});

	if (!row?.verdict) return;
	const number = await checkpointNumber(row);

	// An administrator writes it when the curator did not: it is the platform's word then.
	const by =
		row.decidedById && row.decidedById !== row.curatorId
			? "GDHub"
			: (row.curator?.name ?? "The AI curator");

	await notify(row.project.author, `cp-verdict-sent-${checkpointId}`, {
		checkpointId: checkpointId,
		title: `${by} sent the verdict on Checkpoint ${number}`,
		message: `${VERDICT_LABEL[row.verdict]}. Read the curator's reasoning and choose how to go on.`,
		redirectUrl: `${appUrl()}/user/project/${row.project.slug}/workflow?results=${row.id}`,
	});
};
