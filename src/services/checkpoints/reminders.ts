import dayjs from "dayjs";
import {
	AI_REMIND_HOURS,
	AI_REMIND_LOCAL_HOUR,
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
} from "@/config/prisma-enums";
import {
	dayNumberOn,
	MS_PER_DAY,
	MS_PER_HOUR,
	utcStartOfDay,
} from "@/lib/checkpoints/days";
import { appUrl, reviewUrl } from "@/lib/checkpoints/hrefs";
import { dateOfDay } from "@/lib/checkpoints/plan";
import {
	devlogDayOf,
	sprintOfDay,
	sprintRange,
} from "@/lib/checkpoints/sprints";
import { CHECKPOINT_RUNNING_STATUSES } from "@/lib/checkpoints/status";
import { checkpointNumber } from "@/repositories/checkpoints/number";
import { recipient } from "@/repositories/checkpoints/recipient";
import { CONFIRMED_MEMBERS } from "@/repositories/project/team";
import {
	authorRowSelect,
	checkpointAdmins,
	inZone,
	notify,
	type Recipient,
	workflowUrl,
} from "@/services/checkpoints/notifications";
import { prisma } from "../prisma";

/**
 * The hourly run: an AI checkpoint whose tasks were not sent is reminded once
 * after each of AI_REMIND_HOURS from payment, on the first morning past it in
 * the author's zone — never at night; the transaction id covers a second run.
 */
export const remindPlansUnsent = async (now = new Date()) => {
	const sessions = await prisma.checkpointSession.findMany({
		where: {
			index: 1,
			// Written at payment; each reminder is due within a day of its mark.
			createdAt: {
				gt: new Date(
					now.getTime() - (Math.max(...AI_REMIND_HOURS) + 24) * MS_PER_HOUR,
				),
				lte: new Date(
					now.getTime() - Math.min(...AI_REMIND_HOURS) * MS_PER_HOUR,
				),
			},
			checkpoint: {
				curatorKind: CheckpointCuratorKind.AI,
				status: CheckpointStatus.Active,
				goalAgreedAt: null,
				planCheckedAt: null,
			},
		},
		select: {
			checkpointId: true,
			createdAt: true,
			checkpoint: {
				select: {
					...authorRowSelect,
					project: { select: { slug: true, author: inZone } },
				},
			},
		},
	});

	let sent = 0;
	for (const { checkpointId, createdAt, checkpoint } of sessions) {
		const { author } = checkpoint.project;
		const zone = author.profile?.timezone ?? "UTC";
		if (dayjs(now).tz(zone).hour() !== AI_REMIND_LOCAL_HOUR) continue;
		const hours = (now.getTime() - createdAt.getTime()) / MS_PER_HOUR;
		const after = AI_REMIND_HOURS.filter(
			(mark) => hours >= mark && hours < mark + 24,
		).at(-1);
		if (after === undefined) continue;

		const number = await checkpointNumber(checkpoint);
		await notify(author, `cp-plan-remind-${checkpointId}-${after}`, {
			checkpointId,
			title: `Your AI curator is waiting for the tasks of Checkpoint ${number}`,
			message:
				"Write one to five tasks and send them for a check. Without tasks the checkpoint has nothing to measure at the end.",
			redirectUrl: reviewUrl(checkpoint.project.slug, number, 1, "plan"),
		});
		sent += 1;
	}
	return sent;
};

/**
 * The hourly run, day 15 with the AI curator: the change to the tasks closes
 * in SCOPE_REMIND_BEFORE_HOURS and the author has not confirmed it.
 */
export const remindScopeClosing = async (now = new Date()) => {
	const hour = Math.floor(now.getTime() / MS_PER_HOUR) * MS_PER_HOUR;
	// The change closes SCOPE_ANSWER_HOURS after the review ended.
	const endedBefore = SCOPE_ANSWER_HOURS - SCOPE_REMIND_BEFORE_HOURS;
	const sessions = await prisma.checkpointSession.findMany({
		where: {
			index: SCOPE_SESSION,
			endedAt: {
				gte: new Date(hour - (endedBefore + 1) * MS_PER_HOUR),
				lt: new Date(hour - endedBefore * MS_PER_HOUR),
			},
			checkpoint: {
				curatorKind: CheckpointCuratorKind.AI,
				status: CheckpointStatus.Active,
				scopeConfirmedAt: null,
			},
		},
		select: {
			id: true,
			checkpoint: { select: authorRowSelect },
		},
	});

	for (const { id, checkpoint } of sessions) {
		const number = await checkpointNumber(checkpoint);
		await notify(checkpoint.project.author, `cp-scope-closing-${id}`, {
			checkpointId: id,
			title: `The tasks of Checkpoint ${number} can change for ${SCOPE_REMIND_BEFORE_HOURS} more hours`,
			message:
				"Take the curator's advice or keep them as they are, and press Confirm the tasks. After that they stay as they are until the verdict.",
			redirectUrl: reviewUrl(
				checkpoint.project.slug,
				number,
				SCOPE_SESSION,
				"plan",
			),
		});
	}
	return sessions.length;
};

/**
 * The daily run, on EVIDENCE_REMIND_DAY: the verdict counts only what is
 * attached, so an author with tasks that still have nothing is told which.
 */
export const remindEvidenceDue = async (now = new Date()) => {
	const unproven = {
		kind: CheckpointItemKind.Outcome,
		cut: false,
		artifactId: null,
	};
	// Today is that day for a checkpoint started EVIDENCE_REMIND_DAY - 1 midnights ago.
	const startDay =
		utcStartOfDay(now).getTime() - (EVIDENCE_REMIND_DAY - 1) * MS_PER_DAY;
	const checkpoints = await prisma.projectCheckpoint.findMany({
		where: {
			status: CheckpointStatus.Active,
			startedAt: {
				gte: new Date(startDay),
				lt: new Date(startDay + MS_PER_DAY),
			},
			items: { some: unproven },
		},
		select: {
			id: true,
			...authorRowSelect,
			items: {
				where: unproven,
				orderBy: { order: "asc" },
				select: { text: true },
			},
		},
	});

	let sent = 0;
	for (const checkpoint of checkpoints) {
		const number = await checkpointNumber(checkpoint);
		const tasks = checkpoint.items.map((item) => `"${item.text}"`).join(", ");
		await notify(
			checkpoint.project.author,
			`cp-evidence-due-${checkpoint.id}`,
			{
				checkpointId: checkpoint.id,
				title: `${checkpoint.items.length} tasks of Checkpoint ${number} have no evidence yet`,
				message: `The verdict is in three days and counts only what is attached: ${tasks}. Attach a link to each — a build, a document, a video.`,
				redirectUrl: workflowUrl(checkpoint.project.slug),
			},
		);
		sent += 1;
	}
	return sent;
};

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
							checkpointId: row.id,
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
					checkpointId: row.id,
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

/**
 * The hourly run: a call starting in one to two hours is announced to its
 * curator, in their own zone, and to the team, in UTC — the only zone known
 * for everyone.
 */
export const remindCallsSoon = async (now = new Date()) => {
	// From the top of the hour: a run a few seconds late must not skip a call
	// on the hour.
	const hour = Math.floor(now.getTime() / MS_PER_HOUR) * MS_PER_HOUR;
	const sessions = await prisma.checkpointSession.findMany({
		where: {
			scheduledAt: {
				gte: new Date(hour + MS_PER_HOUR),
				lt: new Date(hour + 2 * MS_PER_HOUR),
			},
			endedAt: null,
			checkpoint: {
				status: { in: CHECKPOINT_RUNNING_STATUSES },
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
		// The time is in the key: a moved call is announced again.
		const key = `cp-call-${session.id}-${session.scheduledAt.getTime()}`;
		await notify(curator, `${key}-${curator.id}`, {
			checkpointId: session.checkpointId,
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
			await notify(person, `${key}-${person.id}`, {
				checkpointId: session.checkpointId,
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
				checkpointId: checkpoint.id,
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
