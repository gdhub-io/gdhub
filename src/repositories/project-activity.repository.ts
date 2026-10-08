import { CheckpointItemKind, TeamMemberStatus } from "@/config/prisma-enums";
import { prisma } from "@/services/prisma";

export type ProjectActivityKind =
	| "devlog"
	| "artifact"
	| "joined"
	| "left"
	| "vacancyOpened"
	| "vacancyClosed"
	| "stage"
	| "reworded"
	| "created";

export type ProjectActivity = {
	id: string;
	at: string;
	kind: ProjectActivityKind;
	/** Who did it, when a person did. */
	actor: string | null;
	/** What it was about: a post's number, an artifact, a role, a title. */
	subject: string | null;
};

/**
 * One page of the project's activity, newest first, everything strictly before
 * `before` — frame 08's feed. Each source is asked for `limit` rows below the
 * cursor and the merge keeps the newest `limit`, so a page costs the same at
 * any depth of the project's history.
 */
export async function getProjectActivity(
	projectId: string,
	{ before, limit }: { before: Date; limit: number },
) {
	const take = limit;
	const [
		project,
		devlogs,
		artifacts,
		joined,
		left,
		opened,
		closed,
		stages,
		revisions,
	] = await Promise.all([
		// The founder's membership is the project being made, not someone joining.
		prisma.project.findFirst({
			where: { id: projectId, createdAt: { lt: before } },
			select: { createdAt: true, author: { select: { name: true } } },
		}),
		prisma.projectReport.findMany({
			where: { projectId, isSystem: false, publishedAt: { lt: before } },
			orderBy: { publishedAt: "desc" },
			take,
			select: {
				id: true,
				publishedAt: true,
				number: true,
				author: { select: { name: true } },
			},
		}),
		prisma.projectArtifact.findMany({
			where: { projectId, createdAt: { lt: before } },
			orderBy: { createdAt: "desc" },
			take,
			select: {
				id: true,
				name: true,
				createdAt: true,
				createdByUser: { select: { name: true } },
			},
		}),
		prisma.teamMember.findMany({
			where: {
				team: { projectId },
				status: TeamMemberStatus.Hired,
				startedAt: { lt: before },
			},
			orderBy: { startedAt: "desc" },
			take,
			select: {
				id: true,
				startedAt: true,
				position: true,
				user: { select: { name: true } },
				speciality: { select: { name: true } },
			},
		}),
		prisma.teamMember.findMany({
			where: { team: { projectId }, finishedAt: { lt: before } },
			orderBy: { finishedAt: "desc" },
			take,
			select: {
				id: true,
				finishedAt: true,
				position: true,
				user: { select: { name: true } },
				speciality: { select: { name: true } },
			},
		}),
		prisma.teamVacancy.findMany({
			where: { team: { projectId }, publishedAt: { lt: before } },
			orderBy: { publishedAt: "desc" },
			take,
			select: { id: true, title: true, publishedAt: true },
		}),
		prisma.teamVacancy.findMany({
			where: { team: { projectId }, closedAt: { lt: before } },
			orderBy: { closedAt: "desc" },
			take,
			select: { id: true, title: true, closedAt: true },
		}),
		prisma.projectWorkflowStep.findMany({
			where: {
				projectWorkflow: { projectId },
				finishedAt: { lt: before },
			},
			orderBy: { finishedAt: "desc" },
			take,
			select: { id: true, name: true, finishedAt: true },
		}),
		// A reworded task carries its old text; the revision's day is the checkpoint's.
		prisma.projectCheckpoint.findMany({
			where: { projectId, revisedAt: { lt: before } },
			orderBy: { revisedAt: "desc" },
			take,
			select: {
				revisedAt: true,
				items: {
					where: {
						kind: CheckpointItemKind.Outcome,
						originalText: { not: null },
					},
					select: { id: true, text: true },
				},
			},
		}),
	]);

	const role = (member: {
		position: string | null;
		speciality: { name: string } | null;
	}) => member.speciality?.name ?? member.position ?? null;

	const events: ProjectActivity[] = [
		...(project
			? [
					{
						id: "created",
						at: project.createdAt.toISOString(),
						kind: "created" as const,
						actor: project.author?.name ?? null,
						subject: null,
					},
				]
			: []),
		...devlogs.map((row) => ({
			id: `devlog-${row.id}`,
			at: row.publishedAt.toISOString(),
			kind: "devlog" as const,
			actor: row.author.name,
			subject: row.number ? `#${row.number}` : null,
		})),
		...artifacts.map((row) => ({
			id: `artifact-${row.id}`,
			at: row.createdAt.toISOString(),
			kind: "artifact" as const,
			actor: row.createdByUser.name,
			subject: row.name,
		})),
		...joined.map((row) => ({
			id: `joined-${row.id}`,
			at: row.startedAt.toISOString(),
			kind: "joined" as const,
			actor: row.user.name,
			subject: role(row),
		})),
		...left.flatMap((row) =>
			row.finishedAt
				? [
						{
							id: `left-${row.id}`,
							at: row.finishedAt.toISOString(),
							kind: "left" as const,
							actor: row.user.name,
							subject: role(row),
						},
					]
				: [],
		),
		...opened.flatMap((row) =>
			row.publishedAt
				? [
						{
							id: `opened-${row.id}`,
							at: row.publishedAt.toISOString(),
							kind: "vacancyOpened" as const,
							actor: null,
							subject: row.title,
						},
					]
				: [],
		),
		...closed.flatMap((row) =>
			row.closedAt
				? [
						{
							id: `closed-${row.id}`,
							at: row.closedAt.toISOString(),
							kind: "vacancyClosed" as const,
							actor: null,
							subject: row.title,
						},
					]
				: [],
		),
		...stages.flatMap((row) =>
			row.finishedAt
				? [
						{
							id: `stage-${row.id}`,
							at: row.finishedAt.toISOString(),
							kind: "stage" as const,
							actor: null,
							subject: row.name,
						},
					]
				: [],
		),
		...revisions.flatMap((row) =>
			row.revisedAt
				? row.items.map((item) => ({
						id: `reworded-${item.id}`,
						at: (row.revisedAt as Date).toISOString(),
						kind: "reworded" as const,
						actor: null,
						subject: item.text,
					}))
				: [],
		),
	];

	const page = events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);

	return {
		events: page,
		// A full page may have more behind it; a short one is the start of the project.
		next: page.length === limit ? (page.at(-1)?.at ?? null) : null,
	};
}
