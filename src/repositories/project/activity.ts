import { Prisma } from "@gdhub-io/gdhub-prisma";
import {
	CheckpointItemKind,
	InvitationStatus,
	TeamMemberStatus,
} from "@/config/prisma-enums";
import { type ActivitySpec, lastActivity, latestOf } from "@/lib/activity";
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

// A member fired since still joined once; the history keeps both.
const JOINED_STATUSES = [TeamMemberStatus.Hired, TeamMemberStatus.Fired];

export type ProjectActivity = {
	id: string;
	at: string;
	kind: ProjectActivityKind;
	/** Who did it, when a person did. */
	actor: string | null;
	/** What it was about: a post's number, an artifact, a role, a title. */
	subject: string | null;
	/** Who invited a member who joined; absent for a hire from a vacancy. */
	invitedBy?: string | null;
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
				status: { in: JOINED_STATUSES },
				startedAt: { lt: before },
			},
			orderBy: { startedAt: "desc" },
			take,
			select: {
				id: true,
				userId: true,
				vacancyId: true,
				createdAt: true,
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

	// A member who came by invitation: the accepted invitation made just before
	// their membership row. Someone invited twice has one per joining.
	const invitations = await prisma.teamInvitation.findMany({
		where: {
			team: { projectId },
			status: InvitationStatus.Accepted,
			userId: {
				in: joined.filter((row) => !row.vacancyId).map((row) => row.userId),
			},
		},
		orderBy: { acceptedAt: "desc" },
		select: {
			userId: true,
			acceptedAt: true,
			invitedBy: { select: { name: true } },
		},
	});
	const inviterOf = (member: { userId: string; createdAt: Date }) =>
		invitations.find(
			(invitation) =>
				invitation.userId === member.userId &&
				invitation.acceptedAt &&
				invitation.acceptedAt <= member.createdAt,
		)?.invitedBy.name ?? null;

	// The position is what the project calls the role; the speciality is the
	// member's own and may be another one they already had.
	const role = (member: {
		position: string | null;
		speciality: { name: string } | null;
	}) => member.position || member.speciality?.name || null;

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
			invitedBy: row.vacancyId ? null : inviterOf(row),
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

/**
 * What counts as a project being worked on. Dates are the events' own, never a
 * row's `updatedAt` on the project itself, which views and system writes move.
 * Every kind in the activity feed is covered (`FEED_KIND_SOURCE`); the spec adds
 * checkpoints, the author's own edits, status changes and equity.
 */
export const PROJECT_ACTIVITY = {
	created: (ids) =>
		prisma.project
			.findMany({
				where: { id: { in: ids } },
				select: { id: true, createdAt: true },
			})
			.then((rows) => rows.map((row) => ({ id: row.id, at: row.createdAt }))),
	// Approval, an admin's change, or the cron waking it on an event.
	statusChanged: (ids) =>
		prisma.project
			.findMany({
				where: { id: { in: ids } },
				select: { id: true, statusChangedAt: true },
			})
			.then((rows) =>
				rows.map((row) => ({ id: row.id, at: row.statusChangedAt })),
			),
	devlog: (ids) =>
		prisma.projectReport
			.groupBy({
				by: ["projectId"],
				where: { projectId: { in: ids }, isSystem: false },
				_max: { publishedAt: true },
			})
			.then((rows) =>
				rows.map((row) => ({ id: row.projectId, at: row._max.publishedAt })),
			),
	artifact: (ids) =>
		prisma.projectArtifact
			.groupBy({
				by: ["projectId"],
				where: { projectId: { in: ids } },
				_max: { createdAt: true },
			})
			.then((rows) =>
				rows.map((row) => ({ id: row.projectId, at: row._max.createdAt })),
			),
	team: async (ids) => {
		const teams = await prisma.team.findMany({
			where: { projectId: { in: ids } },
			select: { id: true, projectId: true },
		});
		const projectOf = new Map(
			teams.flatMap((team) =>
				team.projectId ? [[team.id, team.projectId] as const] : [],
			),
		);
		const teamIds = [...projectOf.keys()];
		const [members, vacancies, investors] = await Promise.all([
			prisma.teamMember.groupBy({
				by: ["teamId"],
				where: { teamId: { in: teamIds }, status: { in: JOINED_STATUSES } },
				_max: { startedAt: true, finishedAt: true },
			}),
			prisma.teamVacancy.groupBy({
				by: ["teamId"],
				where: { teamId: { in: teamIds } },
				_max: { publishedAt: true, closedAt: true },
			}),
			prisma.teamInvestor.groupBy({
				by: ["teamId"],
				where: { teamId: { in: teamIds } },
				_max: { createdAt: true, purchasedAt: true },
			}),
		]);
		return [...members, ...vacancies, ...investors].flatMap(
			({ teamId, _max }) => {
				const id = projectOf.get(teamId);
				return id ? [{ id, at: latestOf(...Object.values(_max)) }] : [];
			},
		);
	},
	// A step's `updatedAt`, not `finishedAt`: going back a stage clears the dates
	// it leaves, and is a move all the same. Steps carry no view counter.
	stage: async (ids) => {
		const workflows = await prisma.projectWorkflow.findMany({
			where: { projectId: { in: ids } },
			select: { id: true, projectId: true },
		});
		const steps = await prisma.projectWorkflowStep.groupBy({
			by: ["projectWorkflowId"],
			where: { projectWorkflowId: { in: workflows.map((row) => row.id) } },
			_max: { updatedAt: true },
		});
		const projectOf = new Map(workflows.map((row) => [row.id, row.projectId]));
		return steps.flatMap((row) => {
			const id = projectOf.get(row.projectWorkflowId);
			return id ? [{ id, at: row._max.updatedAt }] : [];
		});
	},
	checkpoint: (ids) =>
		prisma.projectCheckpoint
			.groupBy({
				by: ["projectId"],
				where: { projectId: { in: ids } },
				_max: {
					createdAt: true,
					startedAt: true,
					revisedAt: true,
					decidedAt: true,
				},
			})
			.then((rows) =>
				rows.map(({ projectId, _max }) => ({
					id: projectId,
					at: latestOf(...Object.values(_max)),
				})),
			),
	// The audit log names who wrote; only the author's own edits count.
	edited: (ids) =>
		prisma.$queryRaw<{ id: string; at: Date }[]>`
			SELECT a."entityId" AS id, max(a."createdAt") AS at
			FROM "AuditLog" a
			JOIN "Project" p ON p.id = a."entityId" AND p."authorId" = a."actorUserId"
			WHERE a.entity = 'Project' AND a."entityId" IN (${Prisma.join(ids)})
				AND a.action = 'UPDATE' AND a.status = 'OK'
			GROUP BY a."entityId"`,
	equity: (ids) =>
		prisma.projectEquity
			.findMany({
				where: { projectId: { in: ids } },
				select: {
					projectId: true,
					updatedAt: true,
					equityAllocations: { select: { updatedAt: true } },
				},
			})
			.then((rows) =>
				rows.map((row) => ({
					id: row.projectId,
					at: latestOf(
						row.updatedAt,
						...row.equityAllocations.map((allocation) => allocation.updatedAt),
					),
				})),
			),
} satisfies ActivitySpec<string>;

/** Which source covers each kind the feed shows, so a new feed kind cannot go uncounted. */
export const FEED_KIND_SOURCE = {
	created: "created",
	devlog: "devlog",
	artifact: "artifact",
	joined: "team",
	left: "team",
	vacancyOpened: "team",
	vacancyClosed: "team",
	stage: "stage",
	reworded: "checkpoint",
} satisfies Record<ProjectActivityKind, keyof typeof PROJECT_ACTIVITY>;

/** When each project was last worked on, by `PROJECT_ACTIVITY`. */
export const getLastProjectActivity = (projectIds: string[]) =>
	lastActivity(PROJECT_ACTIVITY, projectIds);
