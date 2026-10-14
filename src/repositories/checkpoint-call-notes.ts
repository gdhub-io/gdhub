import { Prisma } from "@gdhub-io/gdhub-prisma";
import { CALL_NOTES_DELAY_MINUTES } from "@/config/checkpoint";
import {
	CheckpointItemKind,
	CheckpointSessionContentStatus,
} from "@/config/prisma-enums";
import { dateOfDay } from "@/lib/checkpoint-plan";
import { sprintRange } from "@/lib/checkpoint-sprints";
import { checkpointNumber } from "@/repositories/checkpoint-number";
import { CONFIRMED_MEMBERS } from "@/repositories/scout.games";
import { writeCallNotes } from "@/services/call-notes";
import { appUrl, notify } from "@/services/checkpoint-notifications";
import { prisma } from "@/services/prisma";
import type { CallNotes } from "@/types/checkpoints";

const recipient = { select: { id: true, email: true } } as const;

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
							artifact: { select: { type: true, name: true } },
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
	const range =
		reviewed >= 1 ? sprintRange(checkpoint.startedAt, reviewed) : null;
	const inSprint = range && {
		gte: range.from,
		lt: dateOfDay(range.to, 2),
	};
	const [devlog, artifacts] = inSprint
		? await Promise.all([
				prisma.projectReport.findFirst({
					where: {
						projectId: checkpoint.projectId,
						isSystem: false,
						publishedAt: inSprint,
					},
					orderBy: { publishedAt: "desc" },
					select: { content: true },
				}),
				prisma.projectArtifact.findMany({
					where: { projectId: checkpoint.projectId, createdAt: inSprint },
					select: { type: true, name: true },
				}),
			])
		: [null, []];
	const previous = checkpoint.sessions.find(
		(row) => row.index === session.index - 1,
	)?.content as CallNotes | null | undefined;

	const notes = await writeCallNotes({
		callIndex: session.index,
		goal: checkpoint.goal,
		tasks: checkpoint.items.map((item) => ({
			id: item.id,
			text: item.text,
			done: item.artifact,
			cut: item.cut,
			firstWording: item.originalText,
		})),
		transcript: parts.map((part) => part.text.trim()).join("\n\n"),
		devlog: devlog?.content ?? null,
		artifacts,
		agreedLastCall: previous?.agreed.map((line) => line.text) ?? [],
	});
	if (!notes) return false;

	// A task id the model made up points at nothing on the page: drop it.
	const known = new Set(checkpoint.items.map((item) => item.id));
	const content: CallNotes = {
		...notes,
		discussed: notes.discussed.filter((row) => known.has(row.itemId)),
		notDiscussed: notes.notDiscussed.filter((itemId) => known.has(itemId)),
		agreed: notes.agreed.map((row) => ({
			...row,
			itemId: row.itemId && known.has(row.itemId) ? row.itemId : null,
		})),
	};
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
	const teamUrl = `${appUrl()}/user/project/${checkpoint.project.slug}/workflow/cp${number}/call/${session.index}`;
	const curatorUrl = `${appUrl()}/advisor/checkpoints/${checkpoint.id}/call/${session.index}`;
	for (const person of people.values()) {
		await notify(person, `cp-notes-${sessionId}-${person.id}`, {
			title: `Notes from call ${session.index} on ${checkpoint.project.name} are ready`,
			message:
				"What was discussed, what was agreed for the next call, and the open questions.",
			redirectUrl: person.id === checkpoint.curator?.id ? curatorUrl : teamUrl,
		});
	}
	return true;
};
