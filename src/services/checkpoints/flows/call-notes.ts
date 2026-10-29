import { Prisma } from "@gdhub-io/gdhub-prisma";
import { CALL_NOTES_DELAY_MINUTES } from "@/config/checkpoint";
import {
	CheckpointItemKind,
	CheckpointSessionContentStatus,
} from "@/config/prisma-enums";
import { appUrl, reviewUrl } from "@/lib/checkpoints/hrefs";
import {
	knownOnly,
	sprintEvidence,
} from "@/repositories/checkpoints/call-notes";
import { checkpointNumber } from "@/repositories/checkpoints/number";
import { recipient } from "@/repositories/checkpoints/recipient";
import { CONFIRMED_MEMBERS } from "@/repositories/scout.games";
import {
	toCuratorTask,
	writeCallNotes,
} from "@/services/checkpoints/call-notes";
import { notify } from "@/services/checkpoints/notifications";
import { prisma } from "@/services/prisma";
import type { CallNotes } from "@/types/checkpoints";

/**
 * The hourly run: a call that ended a while ago and has its transcript gets
 * its notes, once. A failed attempt leaves the session for the next run.
 */
export const writeDueCallNotes = async (now = new Date()) => {
	const due = await prisma.checkpointSession.findMany({
		where: {
			transcript: { not: Prisma.AnyNull },
			endedAt: {
				lt: new Date(now.getTime() - CALL_NOTES_DELAY_MINUTES * 60_000),
			},
			contentStatus: null,
		},
		select: { id: true },
	});

	let written = 0;
	for (const { id } of due) {
		// Claimed first: two runs overlapping never write the same notes twice.
		const { count } = await prisma.checkpointSession.updateMany({
			where: { id, contentStatus: null },
			data: { contentStatus: CheckpointSessionContentStatus.Pending },
		});
		if (!count) continue;

		const ok = await writeNotesFor(id).catch((error) => {
			console.error("[call-notes] failed for session", id, error);
			return false;
		});
		if (ok) {
			written += 1;
		} else {
			await prisma.checkpointSession.update({
				where: { id },
				data: { contentStatus: null },
			});
		}
	}
	return written;
};

const writeNotesFor = async (sessionId: string) => {
	const session = await prisma.checkpointSession.findUniqueOrThrow({
		where: { id: sessionId },
		select: {
			index: true,
			transcript: true,
			checkpoint: {
				select: {
					id: true,
					projectId: true,
					createdAt: true,
					startedAt: true,
					goal: true,
					curator: recipient,
					items: {
						where: { kind: CheckpointItemKind.Outcome },
						orderBy: { order: "asc" },
						select: {
							id: true,
							text: true,
							cut: true,
							originalText: true,
							evidence: {
								orderBy: { createdAt: "asc" },
								select: {
									match: true,
									matchNote: true,
									artifact: { select: { type: true, name: true } },
								},
							},
						},
					},
					sessions: { select: { index: true, content: true } },
					project: {
						select: {
							name: true,
							slug: true,
							team: {
								select: {
									members: {
										where: CONFIRMED_MEMBERS,
										select: { user: recipient },
									},
								},
							},
						},
					},
				},
			},
		},
	});
	const { checkpoint } = session;
	const parts = (session.transcript ?? []) as { text: string }[];
	if (!checkpoint.startedAt || !parts.length) return false;

	// Call K opens sprint K, so it looks back at sprint K - 1.
	const reviewed = session.index - 1;
	const { devlogs, artifacts } =
		reviewed >= 1
			? await sprintEvidence(
					checkpoint.projectId,
					checkpoint.startedAt,
					reviewed,
				)
			: { devlogs: [], artifacts: [] };
	const previous = checkpoint.sessions.find(
		(row) => row.index === session.index - 1,
	)?.content as CallNotes | null | undefined;

	const notes = await writeCallNotes(
		{
			callIndex: session.index,
			goal: checkpoint.goal,
			tasks: checkpoint.items.map(toCuratorTask),
			transcript: parts.map((part) => part.text.trim()).join("\n\n"),
			// The human curator's notes read the sprint as one text.
			devlog: devlogs.join("\n\n---\n\n") || null,
			artifacts,
			agreedLastCall: previous?.agreed.map((line) => line.text) ?? [],
		},
		{ checkpointId: checkpoint.id, purpose: "callNotes" },
	);
	if (!notes) return false;

	const content = knownOnly(notes, checkpoint.items);
	await prisma.checkpointSession.update({
		where: { id: sessionId },
		data: { content, contentStatus: CheckpointSessionContentStatus.Ready },
	});

	const number = await checkpointNumber(checkpoint);
	const people = new Map(
		(checkpoint.project.team?.members ?? []).map((member) => [
			member.user.id,
			member.user,
		]),
	);
	if (checkpoint.curator) people.set(checkpoint.curator.id, checkpoint.curator);
	const teamUrl = reviewUrl(
		checkpoint.project.slug,
		number,
		session.index,
		"review",
	);
	const curatorUrl = `${appUrl()}/advisor/checkpoints/${checkpoint.id}/review/${session.index}`;
	for (const person of people.values()) {
		await notify(person, `cp-notes-${sessionId}-${person.id}`, {
			checkpointId: checkpoint.id,
			title: `Notes from call ${session.index} on ${checkpoint.project.name} are ready`,
			message:
				"What was discussed, what was agreed for the next call, and the open questions.",
			redirectUrl: person.id === checkpoint.curator?.id ? curatorUrl : teamUrl,
		});
	}
	return true;
};
