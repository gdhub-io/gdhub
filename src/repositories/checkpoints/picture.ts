import { SPRINTS_PER_CHECKPOINT } from "@/config/checkpoint";
import {
	CheckpointItemKind,
	CheckpointJournalKind,
} from "@/config/prisma-enums";
import { weeklyRange } from "@/lib/checkpoints/capacity";
import {
	type CheckpointPicture,
	directionOf,
	pictureDifference,
} from "@/lib/checkpoints/picture";
import { standingOf } from "@/lib/checkpoints/verdict";
import { curatorItemSelect } from "@/repositories/checkpoints/ai-curator";
import { memberRole } from "@/repositories/checkpoints/ai-curator-context";
import { journal } from "@/repositories/checkpoints/journal";
import { CONFIRMED_MEMBERS } from "@/repositories/project/team";
import { prisma } from "@/services/prisma";
import type { ProjectLink } from "@/types/project";

const day = (date: Date) => date.toISOString().slice(0, 10);

/** The project's own document links, kept beside its store and social links. */
const DOCUMENT_LINKS = {
	concept: "conceptLink",
	gdd: "gddLink",
	pitchdeck: "pitchdeckLink",
	video: "videoLink",
} as const;

/** The project as it stands now, for the picture of `point` (GDHUB-133). */
export async function takePicture(
	checkpointId: string,
	point: number,
	at = new Date(),
): Promise<CheckpointPicture> {
	const checkpoint = await prisma.projectCheckpoint.findUniqueOrThrow({
		where: { id: checkpointId },
		select: {
			projectId: true,
			stageName: true,
			items: { orderBy: { order: "asc" }, select: curatorItemSelect },
		},
	});
	const { projectId } = checkpoint;

	const [
		project,
		members,
		invitations,
		vacancies,
		artifacts,
		devlogs,
		applause,
		inputArtifacts,
	] = await Promise.all([
		prisma.project.findUniqueOrThrow({
			where: { id: projectId },
			select: {
				description: true,
				genre: true,
				platform: true,
				setting: true,
				visualStyle: true,
				links: true,
				conceptLink: true,
				gddLink: true,
				pitchdeckLink: true,
				videoLink: true,
				viewsCount: true,
			},
		}),
		prisma.teamMember.findMany({
			where: { team: { projectId }, ...CONFIRMED_MEMBERS },
			orderBy: { startedAt: "asc" },
			select: {
				id: true,
				position: true,
				speciality: { select: { name: true, level: true } },
				user: {
					select: { name: true, profile: { select: { timeForWork: true } } },
				},
			},
		}),
		prisma.teamInvitation.findMany({
			where: { team: { projectId } },
			orderBy: { createdAt: "asc" },
			select: { id: true, position: true, status: true },
		}),
		prisma.teamVacancy.findMany({
			where: { team: { projectId } },
			orderBy: { createdAt: "asc" },
			select: {
				id: true,
				title: true,
				status: true,
				_count: { select: { applicants: true } },
			},
		}),
		prisma.projectArtifact.findMany({
			where: { projectId },
			orderBy: { createdAt: "asc" },
			select: { id: true, type: true, name: true },
		}),
		prisma.projectReport.findMany({
			where: { projectId, isSystem: false },
			orderBy: { publishedAt: "asc" },
			select: { id: true, number: true, viewsCount: true },
		}),
		prisma.applause.count({ where: { activity: { projectId } } }),
		prisma.checkpointItemEvidence.findMany({
			where: { item: { checkpointId, kind: CheckpointItemKind.Input } },
			select: { itemId: true, artifactId: true },
		}),
	]);

	const links: Record<string, string> = {};
	for (const row of (project.links ?? []) as unknown as ProjectLink[])
		if (row?.link) links[row.platform] = row.link;
	for (const [name, field] of Object.entries(DOCUMENT_LINKS))
		if (project[field]) links[name] = project[field];

	return {
		version: 1,
		at: day(at),
		point,
		project: {
			stage: checkpoint.stageName,
			description: project.description,
			genre: project.genre,
			platform: project.platform,
			setting: project.setting,
			visualStyle: project.visualStyle,
			links,
		},
		team: {
			members: members.map((member) => ({
				id: member.id,
				name: member.user.name ?? "A member",
				role: memberRole(member),
				level: member.speciality?.level ?? null,
				hours: weeklyRange(member.user.profile?.timeForWork),
			})),
			invitations: invitations.map((invitation) => ({
				id: invitation.id,
				role: invitation.position,
				status: invitation.status,
			})),
			vacancies: vacancies.map((vacancy) => ({
				id: vacancy.id,
				title: vacancy.title,
				status: vacancy.status,
				applicants: vacancy._count.applicants,
			})),
		},
		work: {
			artifacts,
			devlogs: devlogs.map(({ id, number }) => ({ id, number })),
		},
		signals: {
			projectViews: project.viewsCount,
			devlogViews: devlogs.reduce((sum, post) => sum + post.viewsCount, 0),
			applause,
		},
		plan: {
			inputs: checkpoint.items
				.filter((item) => item.kind === CheckpointItemKind.Input)
				.map((item) => ({
					id: item.id,
					text: item.text,
					artifactIds: inputArtifacts
						.filter((row) => row.itemId === item.id)
						.map((row) => row.artifactId),
				})),
			tasks: checkpoint.items
				.filter((item) => item.kind === CheckpointItemKind.Outcome)
				.map((item) => ({
					id: item.id,
					text: item.text,
					cut: item.cut,
					proved: standingOf(item).is !== "unproven",
				})),
		},
	};
}

/** The pictures written so far, by point; a point is written once. */
export async function picturesOf(checkpointId: string) {
	const rows = await prisma.checkpointJournalEntry.findMany({
		where: { checkpointId, kind: CheckpointJournalKind.Snapshot },
		orderBy: { createdAt: "asc" },
		select: { sprint: true, output: true },
	});
	const pictures = new Map<number, CheckpointPicture>();
	for (const row of rows)
		if (row.sprint !== null && !pictures.has(row.sprint))
			pictures.set(row.sprint, row.output as unknown as CheckpointPicture);
	return pictures;
}

/** Writes the picture of `point` unless it is already there. */
export async function writePicture(checkpointId: string, point: number) {
	const written = await prisma.checkpointJournalEntry.findFirst({
		where: {
			checkpointId,
			kind: CheckpointJournalKind.Snapshot,
			sprint: point,
		},
		select: { id: true },
	});
	if (written) return false;
	const picture = await takePicture(checkpointId, point);
	await journal({
		checkpointId,
		kind: CheckpointJournalKind.Snapshot,
		sprint: point,
		output: picture,
	});
	return true;
}

/**
 * The whole run so far (GDHUB-133): day 1's picture against the project now,
 * and the direction each sprint's review or call named, sprint 1 first.
 */
export async function runChangeOf(
	checkpointId: string,
	/** The checkpoint's sessions with their content, when the caller has them already. */
	known?: { index: number; content: unknown }[],
) {
	const [pictures, sessions] = await Promise.all([
		picturesOf(checkpointId),
		known ??
			prisma.checkpointSession.findMany({
				where: { checkpointId },
				select: { index: true, content: true },
			}),
	]);
	const directions = sessions
		.filter((session) => session.index > 1)
		.sort((a, b) => a.index - b.index)
		.flatMap((session) => {
			const direction = directionOf(session.content);
			return direction ? [{ sprint: session.index - 1, direction }] : [];
		});
	const first = pictures.get(0);
	if (!first) return { directions, difference: null };
	// The night run has written picture 4 by the verdict; before that, today's stands in.
	const last =
		pictures.get(SPRINTS_PER_CHECKPOINT) ??
		(await takePicture(checkpointId, SPRINTS_PER_CHECKPOINT));
	return { directions, difference: pictureDifference(first, last) };
}
