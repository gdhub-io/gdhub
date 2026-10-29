import { createHash } from "node:crypto";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import {
	AI_APPROVE_HOURS,
	CURATOR_ANSWER_DAYS,
	CURATOR_REPICK_DAYS,
	WITHDRAWAL_DAYS,
} from "@/config/checkpoint";
import { CheckpointJournalKind, SpaceRole } from "@/config/prisma-enums";
import { appUrl, reviewUrl } from "@/lib/checkpoints/hrefs";
import { VERDICT_DAY } from "@/lib/checkpoints/plan";
import type { RefundReason } from "@/lib/checkpoints/refund";
import { journal } from "@/repositories/checkpoints/journal";
import { checkpointNumber } from "@/repositories/checkpoints/number";
import { keptPayment } from "@/repositories/checkpoints/payment";
import { recipient } from "@/repositories/checkpoints/recipient";
import { NovuService } from "../novu";
import { prisma } from "../prisma";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * The checkpoint's letters, each to the bell and by email with one button
 * (frames `oM0eM`, `A5grtn`). A failure is logged and swallowed: nothing a
 * letter announces waits on Novu.
 */

export type Recipient = { id: string; email: string | null };

/** A letter to one person; one about a checkpoint goes into its journal as the platform's step. */
export const notify = async (
	to: Recipient,
	transactionId: string,
	{
		checkpointId,
		...payload
	}: {
		title: string;
		message: string;
		redirectUrl: string;
		checkpointId?: string;
	},
) => {
	let sent = true;
	try {
		await NovuService.send({
			template: "default-message",
			to: { subscriberId: to.id, email: to.email ?? undefined },
			payload,
			transactionId,
		});
	} catch (error) {
		sent = false;
		console.error("[checkpoint] notification failed", transactionId, error);
	}
	if (checkpointId) {
		await journal({
			checkpointId,
			kind: CheckpointJournalKind.Platform,
			input: { to: to.id, transactionId, redirectUrl: payload.redirectUrl },
			output: { title: payload.title, message: payload.message, sent },
		});
	}
};

export const workflowUrl = (slug: string) =>
	`${appUrl()}/user/project/${slug}/workflow`;

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
		checkpointId,
		title: `A new checkpoint for ${row.project.name} waits for your answer`,
		message: `The team has paid and booked your hours. Accept or decline by ${answerBy}; the money is only held until you do.`,
		redirectUrl: `${appUrl()}/advisor/requests`,
	});
};

/** What a letter to the author needs: where to send it and how to number the checkpoint. */
export const authorRowSelect = {
	projectId: true,
	createdAt: true,
	project: { select: { slug: true, author: recipient } },
} as const;

const authorRow = (checkpointId: string) =>
	prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: authorRowSelect,
	});

/**
 * Day 1 with the AI curator: the first letter is written and waits for the
 * tasks. Sent once, whether or not the read came back.
 */
export const notifyDayOne = async (checkpointId: string, read: boolean) => {
	const row = await authorRow(checkpointId);
	if (!row) return;

	const number = await checkpointNumber(row);
	await notify(row.project.author, `cp-day-one-${checkpointId}`, {
		checkpointId,
		title: read
			? `Your AI curator has read the goal of Checkpoint ${number}`
			: `Checkpoint ${number} has started`,
		message:
			"Write one to five tasks that will show the goal is reached — your own or the curator's suggestions — and send them for a check.",
		redirectUrl: reviewUrl(row.project.slug, number, 1, "plan"),
	});
};

/** Day 1: the one check of the tasks is written; the author approves the plan next. */
export const notifyPlanChecked = async (checkpointId: string, closes: Date) => {
	const row = await authorRow(checkpointId);
	if (!row) return;

	const number = await checkpointNumber(row);
	await notify(row.project.author, `cp-plan-checked-${checkpointId}`, {
		checkpointId,
		title: `Your AI curator has checked the plan of Checkpoint ${number}`,
		message: `Read the advice, change what you want and approve the plan. If you don't, it approves itself as it stands on ${dayjs.utc(closes).format("D MMM, HH:mm [UTC]")}.`,
		redirectUrl: reviewUrl(row.project.slug, number, 1, "plan"),
	});
};

/** Day 1: nobody approved the checked plan, so it approved itself as it stood. */
export const notifyPlanApproved = async (checkpointId: string) => {
	const row = await authorRow(checkpointId);
	if (!row) return;

	const number = await checkpointNumber(row);
	await notify(row.project.author, `cp-plan-approved-${checkpointId}`, {
		checkpointId,
		title: `The plan of Checkpoint ${number} is approved`,
		message: `It approved itself as it stood, ${AI_APPROVE_HOURS} hours after the curator's check. The goal and tasks are fixed until day 15, when they can change once more.`,
		redirectUrl: reviewUrl(row.project.slug, number, 1, "plan"),
	});
};

/** A task's evidence was looked at and does not show what the task promised, while there is time to fix it. */
export const notifyEvidenceMismatch = async (
	checkpointId: string,
	item: { id: string; text: string },
	note: string,
	link: string,
) => {
	const row = await authorRow(checkpointId);
	if (!row) return;

	const linkKey = createHash("sha256").update(link).digest("hex").slice(0, 12);
	await notify(row.project.author, `cp-evidence-${item.id}-${linkKey}`, {
		checkpointId,
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

	const [number, kept] = await Promise.all([
		checkpointNumber(row),
		answer === "accepted" ? null : keptPayment(checkpointId),
	]);
	const transactionId = `cp-${answer}-${checkpointId}-${row.createdAt.getTime()}`;
	// A card hold is let go on the way back; money already taken stays.
	const repick = kept
		? `Your payment stays with the checkpoint. Pick another curator and a time for the first call, or cancel it for a full refund. If nobody is picked within ${CURATOR_REPICK_DAYS} days, it is cancelled and refunded.`
		: "The hold on your card is released, so nothing was charged. Pick another curator to buy it again.";

	const letters = {
		accepted: {
			title: `${curatorName} takes Checkpoint ${number}`,
			message: row.startedAt
				? `It starts on ${dayjs.utc(row.startedAt).format("D MMM")}. The first call is set on your Workflow.`
				: "The first call is set on your Workflow.",
		},
		declined: {
			title: `${curatorName} can't take Checkpoint ${number}`,
			message: repick,
		},
		silent: {
			title: `${curatorName} did not answer about Checkpoint ${number}`,
			message: repick,
		},
	} satisfies Record<CuratorAnswer, { title: string; message: string }>;

	await notify(row.project.author, transactionId, {
		checkpointId,
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
		withdrawal: `You withdrew from it within the ${WITHDRAWAL_DAYS} days.`,
		curatorGone:
			"Your curator stopped and we could not find a replacement in time.",
		noVerdict: `No verdict was sent by the end of day ${VERDICT_DAY}.`,
	}[reason];

	await notify(row.project.author, `cp-refund-${checkpointId}`, {
		checkpointId,
		title: `Checkpoint ${number} is closed and ${amount} is on its way back`,
		message: `${why} The refund reaches your card in 5–10 business days. It covers everything that was not delivered.`,
		redirectUrl: workflowUrl(row.project.slug),
	});
};

/** Nobody was picked after a curator could not take it: cancelled, money on its way back. */
export const notifyAuthorOfLapse = async (
	checkpointId: string,
	amount: string,
) => {
	const row = await authorRow(checkpointId);
	if (!row) return;

	const number = await checkpointNumber(row);
	await notify(row.project.author, `cp-lapse-${checkpointId}`, {
		checkpointId,
		title: `Checkpoint ${number} is cancelled and ${amount} is on its way back`,
		message: `No other curator was picked within ${CURATOR_REPICK_DAYS} days. The refund reaches your card in 5–10 business days.`,
		redirectUrl: workflowUrl(row.project.slug),
	});
};

/** Who hears about a checkpoint only an administrator can unblock. */
export const checkpointAdmins = () =>
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

/** A team member, with the time zone their reminders are written in. */
export const inZone = {
	select: { id: true, email: true, profile: { select: { timezone: true } } },
} as const;

/**
 * A request to move a call, and its answer (GDHUB-90): told to the side that
 * has to act on it, times in their own zone.
 */
export const notifyCallMove = async (
	sessionId: string,
	to: "curator" | "author",
	{ event, moveTo }: { event: "asked" | "approved" | "declined"; moveTo: Date },
) => {
	const session = await prisma.checkpointSession.findUnique({
		where: { id: sessionId },
		select: {
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
							name: true,
							advisorAvailability: { select: { timeZone: true } },
						},
					},
					project: { select: { name: true, slug: true, author: inZone } },
				},
			},
		},
	});
	const curator = session?.checkpoint.curator;
	if (!session || !curator) return;
	const { checkpoint, index, checkpointId } = session;

	const number = await checkpointNumber(checkpoint);
	const person =
		to === "curator"
			? {
					...curator,
					zone: curator.advisorAvailability?.timeZone ?? "UTC",
					url: `${appUrl()}/advisor/checkpoints/${checkpointId}/review/${index}`,
				}
			: {
					...checkpoint.project.author,
					zone: checkpoint.project.author.profile?.timezone ?? "UTC",
					url: reviewUrl(checkpoint.project.slug, number, index),
				};
	const at = (date: Date) =>
		`${dayjs(date).tz(person.zone).format("ddd D MMM, HH:mm")} (${person.zone})`;
	const other =
		to === "curator" ? "The team" : (curator.name ?? "Your curator");
	const call = `call ${index} on ${checkpoint.project.name}`;

	const letters = {
		asked: {
			title: `${other} asks to move ${call}`,
			message: `To ${at(moveTo)}. Until you answer, it stays on ${at(session.scheduledAt)}.`,
		},
		approved: {
			title: `Call ${index} on ${checkpoint.project.name} is moved`,
			message: `It is now on ${at(moveTo)}. The other calls keep their days.`,
		},
		declined: {
			title: `Call ${index} on ${checkpoint.project.name} keeps its time`,
			message: `${other} kept ${at(session.scheduledAt)} rather than ${at(moveTo)}.`,
		},
	};

	await notify(
		person,
		`cp-move-${event}-${sessionId}-${moveTo.getTime()}-${person.id}`,
		{ checkpointId, ...letters[event], redirectUrl: person.url },
	);
};
