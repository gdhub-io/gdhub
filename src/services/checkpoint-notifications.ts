import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { CURATOR_ANSWER_DAYS } from "@/config/checkpoint";
import { CheckpointStatus } from "@/config/prisma-enums";
import { dayNumberOn, utcStartOfDay } from "@/lib/checkpoint-days";
import { dateOfDay } from "@/lib/checkpoint-plan";
import type { RefundReason } from "@/lib/checkpoint-refund";
import {
	devlogDayOf,
	sprintOfDay,
	sprintRange,
} from "@/lib/checkpoint-sprints";
import { checkpointNumber } from "@/repositories/checkpoint-number";
import { CONFIRMED_MEMBERS } from "@/repositories/scout.games";
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
					"What got done, what is next, and what is in the way — your curator reads it before the next call.",
				redirectUrl: workflowUrl(checkpoint.project.slug),
			},
		);
		sent += 1;
	}
	return sent;
};
