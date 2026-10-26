import { createHash } from "node:crypto";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import {
	AI_REMIND_HOURS,
	CURATOR_ANSWER_DAYS,
	EVIDENCE_REMIND_DAY,
	SCOPE_ANSWER_HOURS,
	SCOPE_REMIND_BEFORE_HOURS,
	SCOPE_SESSION,
	VERDICT_DUE_DAYS,
} from "@/config/checkpoint";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
	SpaceRole,
} from "@/config/prisma-enums";
import { dayNumberOn, MS_PER_DAY, utcStartOfDay } from "@/lib/checkpoint-days";
import { dateOfDay } from "@/lib/checkpoint-plan";
import type { RefundReason } from "@/lib/checkpoint-refund";
import {
	devlogDayOf,
	sprintOfDay,
	sprintRange,
} from "@/lib/checkpoint-sprints";
import { checkpointNumber } from "@/repositories/checkpoint-number";
import { CONFIRMED_MEMBERS } from "@/repositories/scout.games";
import type { CuratorReview } from "@/types/checkpoints";
import { NovuService } from "./novu";
import { prisma } from "./prisma";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * The checkpoint's letters, each to the bell and by email with one button
 * (frames `oM0eM`, `A5grtn`). A failure is logged and swallowed: nothing a
 * letter announces waits on Novu.
 */

export const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "";

type Recipient = { id: string; email: string | null };

export const notify = async (
	to: Recipient,
	transactionId: string,
	payload: { title: string; message: string; redirectUrl: string },
) => {
	try {
		await NovuService.send({
			template: "default-message",
			to: { subscriberId: to.id, email: to.email ?? undefined },
			payload,
			transactionId,
		});
	} catch (error) {
		console.error("[checkpoint] notification failed", transactionId, error);
	}
};

const workflowUrl = (slug: string) =>
	`${appUrl()}/user/project/${slug}/workflow`;

export const recipient = { select: { id: true, email: true } } as const;

/** Curator's Review for the team: one session of one checkpoint. */
export const reviewUrl = (slug: string, number: number, index: number) =>
	`${workflowUrl(slug)}/cp${number}/review/${index}`;

/** A paid checkpoint waits for its human curator's answer. */
export const notifyCuratorAsked = async (checkpointId: string) => {
	const row = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			project: { select: { name: true } },
			curator: recipient,
		},
	});
	if (!row?.curator) return;

	const answerBy = dayjs().add(CURATOR_ANSWER_DAYS, "day").format("D MMM");
	await notify(row.curator, `cp-asked-${checkpointId}-${row.curator.id}`, {
		title: `A new checkpoint for ${row.project.name} waits for your answer`,
		message: `The team has paid and booked your hours. Accept or decline by ${answerBy}; the money is only held until you do.`,
		redirectUrl: `${appUrl()}/advisor/requests`,
	});
};

const dayOneRow = (checkpointId: string) =>
	prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			projectId: true,
			createdAt: true,
			project: { select: { slug: true, author: recipient } },
		},
	});

/**
 * Day 1 with the AI curator: the first letter is written and waits for the
 * tasks. Sent once, whether or not the read came back.
 */
export const notifyDayOne = async (checkpointId: string, read: boolean) => {
	const row = await dayOneRow(checkpointId);
	if (!row) return;

	const number = await checkpointNumber(row);
	await notify(row.project.author, `cp-day-one-${checkpointId}`, {
		title: read
			? `Your AI curator has read the goal of Checkpoint ${number}`
			: `Checkpoint ${number} has started`,
		message:
			"Write one to five tasks that will show the goal is reached — your own or the curator's suggestions — and send them for a check.",
		redirectUrl: reviewUrl(row.project.slug, number, 1),
	});
};

/** Day 1: the one check of the tasks is written; the author approves the plan next. */
export const notifyPlanChecked = async (checkpointId: string, closes: Date) => {
	const row = await dayOneRow(checkpointId);
	if (!row) return;

	const number = await checkpointNumber(row);
	await notify(row.project.author, `cp-plan-checked-${checkpointId}`, {
		title: `Your AI curator has checked the plan of Checkpoint ${number}`,
		message: `Read the advice, change what you want and approve the plan. If you don't, it approves itself as it stands on ${dayjs.utc(closes).format("D MMM, HH:mm [UTC]")}.`,
		redirectUrl: reviewUrl(row.project.slug, number, 1),
	});
};

/**
 * The hourly run: an AI checkpoint whose tasks were not sent is reminded at
 * each of AI_REMIND_HOURS after payment — once each, as it goes out in the
 * one hour that mark falls in, and the transaction id covers a second run.
 */
export const remindPlansUnsent = async (now = new Date()) => {
	const hour = Math.floor(now.getTime() / HOUR) * HOUR;
	let sent = 0;
	for (const after of AI_REMIND_HOURS) {
		const sessions = await prisma.checkpointSession.findMany({
			where: {
				index: 1,
				// Written at payment, with the rest of the checkpoint's sessions.
				createdAt: {
					gte: new Date(hour - (after + 1) * HOUR),
					lt: new Date(hour - after * HOUR),
				},
				checkpoint: {
					curatorKind: CheckpointCuratorKind.AI,
					status: CheckpointStatus.Active,
					goalAgreedAt: null,
				},
			},
			select: {
				checkpointId: true,
				content: true,
				checkpoint: {
					select: {
						projectId: true,
						createdAt: true,
						project: { select: { slug: true, author: recipient } },
					},
				},
			},
		});
		const waiting = sessions.filter(
			(session) =>
				(session.content as { step?: string } | null)?.step !== "checked",
		);

		for (const { checkpointId, checkpoint } of waiting) {
			const number = await checkpointNumber(checkpoint);
			await notify(
				checkpoint.project.author,
				`cp-plan-remind-${checkpointId}-${after}`,
				{
					title: `Your AI curator is waiting for the tasks of Checkpoint ${number}`,
					message:
						"Write one to five tasks and send them for a check. Without tasks the checkpoint has nothing to measure at the end.",
					redirectUrl: reviewUrl(checkpoint.project.slug, number, 1),
				},
			);
		}
		sent += waiting.length;
	}
	return sent;
};

/** Day 1: nobody approved the checked plan, so it approved itself as it stood. */
export const notifyPlanApproved = async (checkpointId: string) => {
	const row = await dayOneRow(checkpointId);
	if (!row) return;

	const number = await checkpointNumber(row);
	await notify(row.project.author, `cp-plan-approved-${checkpointId}`, {
		title: `The plan of Checkpoint ${number} is approved`,
		message:
			"It approved itself as it stood, 12 hours after the curator's check. The goal and tasks are fixed until day 15, when they can change once more.",
		redirectUrl: reviewUrl(row.project.slug, number, 1),
	});
};

/**
 * The hourly run, day 15 with the AI curator: the change to the tasks closes
 * in SCOPE_REMIND_BEFORE_HOURS and the author has not confirmed it.
 */
export const remindScopeClosing = async (now = new Date()) => {
	const hour = Math.floor(now.getTime() / HOUR) * HOUR;
	// The change closes SCOPE_ANSWER_HOURS after the review ended.
	const endedBefore = SCOPE_ANSWER_HOURS - SCOPE_REMIND_BEFORE_HOURS;
	const sessions = await prisma.checkpointSession.findMany({
		where: {
			index: SCOPE_SESSION,
			endedAt: {
				gte: new Date(hour - (endedBefore + 1) * HOUR),
				lt: new Date(hour - endedBefore * HOUR),
			},
			checkpoint: {
				curatorKind: CheckpointCuratorKind.AI,
				status: CheckpointStatus.Active,
			},
		},
		select: {
			id: true,
			content: true,
			checkpoint: {
				select: {
					projectId: true,
					createdAt: true,
					project: { select: { slug: true, author: recipient } },
				},
			},
		},
	});
	const open = sessions.filter(
		(session) => !(session.content as CuratorReview | null)?.approved,
	);

	for (const { id, checkpoint } of open) {
		const number = await checkpointNumber(checkpoint);
		await notify(checkpoint.project.author, `cp-scope-closing-${id}`, {
			title: `The tasks of Checkpoint ${number} can change for ${SCOPE_REMIND_BEFORE_HOURS} more hours`,
			message:
				"Take the curator's advice or keep them as they are, and press Confirm the tasks. After that they stay as they are until the verdict.",
			redirectUrl: reviewUrl(checkpoint.project.slug, number, SCOPE_SESSION),
		});
	}
	return open.length;
};

/**
 * The daily run, on EVIDENCE_REMIND_DAY: the verdict counts only what is
 * attached, so an author with tasks that still have nothing is told which.
 */
export const remindEvidenceDue = async (now = new Date()) => {
	const checkpoints = await prisma.projectCheckpoint.findMany({
		where: { status: CheckpointStatus.Active, startedAt: { not: null } },
		select: {
			id: true,
			projectId: true,
			createdAt: true,
			startedAt: true,
			project: { select: { slug: true, author: recipient } },
			items: {
				where: {
					kind: CheckpointItemKind.Outcome,
					cut: false,
					artifactId: null,
				},
				orderBy: { order: "asc" },
				select: { text: true },
			},
		},
	});

	let sent = 0;
	for (const checkpoint of checkpoints) {
		if (!checkpoint.startedAt || !checkpoint.items.length) continue;
		if (dayNumberOn(checkpoint.startedAt, now) !== EVIDENCE_REMIND_DAY)
			continue;

		const number = await checkpointNumber(checkpoint);
		const tasks = checkpoint.items.map((item) => `"${item.text}"`).join(", ");
		await notify(
			checkpoint.project.author,
			`cp-evidence-due-${checkpoint.id}`,
			{
				title: `${checkpoint.items.length} tasks of Checkpoint ${number} have no evidence yet`,
				message: `The verdict is in three days and counts only what is attached: ${tasks}. Attach a link to each — a build, a document, a video.`,
				redirectUrl: workflowUrl(checkpoint.project.slug),
			},
		);
		sent += 1;
	}
	return sent;
};

/** A task's evidence was looked at and does not show what the task promised, while there is time to fix it. */
export const notifyEvidenceMismatch = async (
	checkpointId: string,
	item: { id: string; text: string },
	note: string,
	link: string,
) => {
	const row = await dayOneRow(checkpointId);
	if (!row) return;

	const linkKey = createHash("sha256").update(link).digest("hex").slice(0, 12);
	await notify(row.project.author, `cp-evidence-${item.id}-${linkKey}`, {
		title: `The evidence for "${item.text}" does not show it yet`,
		message: `${note} Attach something that shows it before the verdict.`,
		redirectUrl: workflowUrl(row.project.slug),
	});
};

type CuratorAnswer = "accepted" | "declined" | "silent";

/**
 * The author hears how the curator answered. The curator's name is passed in:
 * after a no the checkpoint no longer names them.
 */
export const notifyAuthorOfAnswer = async (
	checkpointId: string,
	curatorName: string,
	answer: CuratorAnswer,
) => {
	const row = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			projectId: true,
			createdAt: true,
			startedAt: true,
			project: { select: { slug: true, author: recipient } },
		},
	});
	if (!row) return;

	const number = await checkpointNumber(row);
	const transactionId = `cp-${answer}-${checkpointId}-${row.createdAt.getTime()}`;

	const letters = {
		accepted: {
			title: `${curatorName} takes Checkpoint ${number}`,
			message: row.startedAt
				? `It starts on ${dayjs.utc(row.startedAt).format("D MMM")}. The first call is set on your Workflow.`
				: "The first call is set on your Workflow.",
		},
		declined: {
			title: `${curatorName} can't take Checkpoint ${number}`,
			message:
				"Nothing was charged. Pick another curator and a time for the first call.",
		},
		silent: {
			title: `${curatorName} did not answer about Checkpoint ${number}`,
			message:
				"The hold on your card is released. Pick another curator and a time for the first call.",
		},
	} satisfies Record<CuratorAnswer, { title: string; message: string }>;

	await notify(row.project.author, transactionId, {
		...letters[answer],
		redirectUrl: workflowUrl(row.project.slug),
	});
};

/** Money back on a checkpoint that stops, and why. `amount` is in whole units. */
export const notifyAuthorOfRefund = async (
	checkpointId: string,
	amount: string,
	reason: RefundReason,
) => {
	const row = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			projectId: true,
			createdAt: true,
			project: { select: { slug: true, author: recipient } },
		},
	});
	if (!row) return;

	const number = await checkpointNumber(row);
	const why = {
		withdrawal: "You withdrew from it within the 14 days.",
		curatorGone:
			"Your curator stopped and we could not find a replacement in time.",
		noVerdict: "No verdict was sent by the end of day 31.",
	}[reason];

	await notify(row.project.author, `cp-refund-${checkpointId}`, {
		title: `Checkpoint ${number} is closed and ${amount} is on its way back`,
		message: `${why} The refund reaches your card in 5–10 business days. It covers everything that was not delivered.`,
		redirectUrl: workflowUrl(row.project.slug),
	});
};

/** Who hears about a checkpoint only an administrator can unblock. */
const checkpointAdmins = () =>
	prisma.user.findMany({
		where: {
			OR: [
				{ isSuperAdmin: true },
				{
					spaceMembers: {
						some: {
							spaceType: "hub",
							role: { in: [SpaceRole.Owner, SpaceRole.Admin] },
						},
					},
				},
			],
		},
		select: { id: true, email: true },
	});

/**
 * The verdict nobody has sent: the day before it is due its curator is
 * reminded; the first day after, the administrators are told — once, because
 * each goes out on its one day and the transaction id covers a second run.
 */
export const remindVerdictsDue = async (now = new Date()) => {
	// A verdict is due by the day VERDICT_DUE_DAYS after the day of dueAt.
	const dueOn = (offset: number) => {
		const gte = new Date(
			utcStartOfDay(now).getTime() + (offset - VERDICT_DUE_DAYS) * MS_PER_DAY,
		);
		return { gte, lt: new Date(gte.getTime() + MS_PER_DAY) };
	};
	const undecided = (offset: number) =>
		prisma.projectCheckpoint.findMany({
			where: {
				status: CheckpointStatus.Review,
				curatorKind: CheckpointCuratorKind.Human,
				verdict: null,
				dueAt: dueOn(offset),
			},
			select: {
				id: true,
				project: { select: { name: true } },
				curator: recipient,
			},
		});
	const [dueTomorrow, lateToday] = await Promise.all([
		undecided(1),
		undecided(-1),
	]);
	const admins = lateToday.length ? await checkpointAdmins() : [];

	await Promise.all([
		...dueTomorrow.flatMap((row) =>
			row.curator
				? [
						notify(row.curator, `cp-verdict-due-${row.id}`, {
							title: `Your verdict on ${row.project.name} is due tomorrow`,
							message:
								"Send it before the day ends. After that an administrator closes the checkpoint.",
							redirectUrl: `${appUrl()}/advisor/checkpoints`,
						}),
					]
				: [],
		),
		...lateToday.flatMap((row) =>
			admins.map((admin) =>
				notify(admin, `cp-verdict-overdue-${row.id}-${admin.id}`, {
					title: `The verdict on ${row.project.name} is overdue`,
					message:
						"Its curator did not send it by day 31. Write it or refund the checkpoint from the admin list.",
					redirectUrl: `${appUrl()}/admin/checkpoints`,
				}),
			),
		),
	]);

	return { dueTomorrow: dueTomorrow.length, overdue: lateToday.length };
};

const HOUR = 60 * 60 * 1000;

/** A team member, with the time zone their reminders are written in. */
const inZone = {
	select: { id: true, email: true, profile: { select: { timezone: true } } },
} as const;

/**
 * The hourly run: a call starting in one to two hours is announced to its
 * curator, in their own zone, and to the team, in UTC — the only zone known
 * for everyone.
 */
export const remindCallsSoon = async (now = new Date()) => {
	// From the top of the hour: a run a few seconds late must not skip a call
	// on the hour.
	const hour = Math.floor(now.getTime() / HOUR) * HOUR;
	const sessions = await prisma.checkpointSession.findMany({
		where: {
			scheduledAt: {
				gte: new Date(hour + HOUR),
				lt: new Date(hour + 2 * HOUR),
			},
			endedAt: null,
			checkpoint: {
				status: { in: [CheckpointStatus.Active, CheckpointStatus.Review] },
				curatorId: { not: null },
			},
		},
		select: {
			id: true,
			index: true,
			scheduledAt: true,
			checkpointId: true,
			checkpoint: {
				select: {
					projectId: true,
					createdAt: true,
					curator: {
						select: {
							id: true,
							email: true,
							advisorAvailability: { select: { timeZone: true } },
						},
					},
					project: {
						select: {
							name: true,
							slug: true,
							author: inZone,
							team: {
								select: {
									members: {
										where: CONFIRMED_MEMBERS,
										select: { user: inZone },
									},
								},
							},
						},
					},
				},
			},
		},
	});

	let sent = 0;
	for (const session of sessions) {
		const { checkpoint } = session;
		const curator = checkpoint.curator;
		if (!curator) continue;

		const number = await checkpointNumber(checkpoint);
		const at = (zone: string) =>
			`${dayjs(session.scheduledAt).tz(zone).format("HH:mm")} (${zone})`;
		const title = `Your call on ${checkpoint.project.name} starts in an hour`;

		const curatorZone = curator.advisorAvailability?.timeZone ?? "UTC";
		await notify(curator, `cp-call-${session.id}-${curator.id}`, {
			title,
			message: `Call ${session.index} of Checkpoint ${number}, at ${at(curatorZone)}. The team is let in once you join.`,
			redirectUrl: `${appUrl()}/advisor/checkpoints/${session.checkpointId}/review/${session.index}`,
		});

		const team = new Map<
			string,
			Recipient & { profile: { timezone: string | null } | null }
		>();
		team.set(checkpoint.project.author.id, checkpoint.project.author);
		for (const member of checkpoint.project.team?.members ?? []) {
			if (member.user) team.set(member.user.id, member.user);
		}
		team.delete(curator.id);

		for (const person of team.values()) {
			await notify(person, `cp-call-${session.id}-${person.id}`, {
				title,
				message: `Call ${session.index} of Checkpoint ${number}, at ${at(person.profile?.timezone ?? "UTC")}. You can join once your curator opens the room.`,
				redirectUrl: reviewUrl(checkpoint.project.slug, number, session.index),
			});
		}
		sent += 1 + team.size;
	}
	return sent;
};

/**
 * The daily run: on a sprint's last day, an author whose sprint has no devlog
 * yet is reminded that it is due today.
 */
export const remindDevlogsDue = async (now = new Date()) => {
	const checkpoints = await prisma.projectCheckpoint.findMany({
		where: { status: CheckpointStatus.Active, startedAt: { not: null } },
		select: {
			id: true,
			projectId: true,
			startedAt: true,
			curatorKind: true,
			project: { select: { name: true, slug: true, author: recipient } },
		},
	});

	let sent = 0;
	for (const checkpoint of checkpoints) {
		if (!checkpoint.startedAt) continue;
		const day = dayNumberOn(checkpoint.startedAt, now);
		const sprint = sprintOfDay(day);
		if (day !== devlogDayOf(sprint)) continue;

		const { from } = sprintRange(checkpoint.startedAt, sprint);
		const written = await prisma.projectReport.count({
			where: {
				projectId: checkpoint.projectId,
				publishedAt: {
					gte: from,
					lt: dateOfDay(checkpoint.startedAt, day + 1),
				},
			},
		});
		if (written) continue;

		await notify(
			checkpoint.project.author,
			`cp-devlog-${checkpoint.id}-${sprint}`,
			{
				title: `The devlog for Sprint ${sprint} of ${checkpoint.project.name} is due today`,
				message:
					checkpoint.curatorKind === CheckpointCuratorKind.AI
						? "What got done, what is next, and what is in the way — your AI curator reads it for the sprint review."
						: "What got done, what is next, and what is in the way — your curator reads it before the next call.",
				redirectUrl: workflowUrl(checkpoint.project.slug),
			},
		);
		sent += 1;
	}
	return sent;
};
