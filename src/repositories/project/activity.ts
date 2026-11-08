import { AuditStatus } from "@gdhub-io/gdhub-prisma";
import {
	AuditAction,
	CheckpointItemKind,
	InvitationStatus,
	TeamMemberStatus,
} from "@/config/prisma-enums";
import {
	type ActivityRows,
	type ActivitySpec,
	lastActivity,
} from "@/lib/activity";
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
				// A member fired since still joined once; the history keeps both.
				status: { in: [TeamMemberStatus.Hired, TeamMemberStatus.Fired] },
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

const latestOf = (...dates: (Date | null | undefined)[]) =>
	dates.reduce<Date | null>(
		(latest, date) => (date && (!latest || date > latest) ? date : latest),
		null,
	);

const byTeamProject = <T extends { team: { projectId: string | null } }>(
	rows: T[],
	at: (row: T) => Date | null,
): ActivityRows =>
	rows.flatMap((row) =>
		row.team.projectId ? [{ id: row.team.projectId, at: at(row) }] : [],
	);

/**
 * What counts as a project being worked on: every kind in its activity feed,
 * plus what the feed does not show. Dates are the events' own, never a row's
 * `updatedAt`, which a view or a system write moves as well.
 */
export const PROJECT_ACTIVITY: ActivitySpec<
	ProjectActivityKind | "statusChanged" | "checkpoint" | "edited" | "equity"
> = {
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
				where: { id: { in: ids }, statusChangedAt: { not: null } },
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
	joined: (ids) =>
		prisma.teamMember
			.findMany({
				where: { team: { projectId: { in: ids } } },
				select: { startedAt: true, team: { select: { projectId: true } } },
			})
			.then((rows) => byTeamProject(rows, (row) => row.startedAt)),
	left: (ids) =>
		prisma.teamMember
			.findMany({
				where: { team: { projectId: { in: ids } }, finishedAt: { not: null } },
				select: { finishedAt: true, team: { select: { projectId: true } } },
			})
			.then((rows) => byTeamProject(rows, (row) => row.finishedAt)),
	vacancyOpened: (ids) =>
		prisma.teamVacancy
			.findMany({
				where: { team: { projectId: { in: ids } }, publishedAt: { not: null } },
				select: { publishedAt: true, team: { select: { projectId: true } } },
			})
			.then((rows) => byTeamProject(rows, (row) => row.publishedAt)),
	vacancyClosed: (ids) =>
		prisma.teamVacancy
			.findMany({
				where: { team: { projectId: { in: ids } }, closedAt: { not: null } },
				select: { closedAt: true, team: { select: { projectId: true } } },
			})
			.then((rows) => byTeamProject(rows, (row) => row.closedAt)),
	// A step's `updatedAt`, not `finishedAt`: going back a stage clears the dates
	// it leaves, and is a move all the same. Steps carry no view counter.
	stage: (ids) =>
		prisma.projectWorkflowStep
			.findMany({
				where: { projectWorkflow: { projectId: { in: ids } } },
				select: {
					updatedAt: true,
					projectWorkflow: { select: { projectId: true } },
				},
			})
			.then((rows) =>
				rows.map((row) => ({
					id: row.projectWorkflow.projectId,
					at: row.updatedAt,
				})),
			),
	reworded: (ids) =>
		prisma.projectCheckpoint
			.groupBy({
				by: ["projectId"],
				where: { projectId: { in: ids } },
				_max: { revisedAt: true },
			})
			.then((rows) =>
				rows.map((row) => ({ id: row.projectId, at: row._max.revisedAt })),
			),
	checkpoint: (ids) =>
		prisma.projectCheckpoint
			.groupBy({
				by: ["projectId"],
				where: { projectId: { in: ids } },
				_max: { createdAt: true, startedAt: true, decidedAt: true },
			})
			.then((rows) =>
				rows.map(({ projectId, _max }) => ({
					id: projectId,
					at: latestOf(_max.createdAt, _max.startedAt, _max.decidedAt),
				})),
			),
	// The audit log names who wrote; only the author's own edits count.
	edited: async (ids) => {
		const [projects, edits] = await Promise.all([
			prisma.project.findMany({
				where: { id: { in: ids } },
				select: { id: true, authorId: true },
			}),
			prisma.auditLog.groupBy({
				by: ["entityId", "actorUserId"],
				where: {
					entity: "Project",
					entityId: { in: ids },
					action: AuditAction.UPDATE,
					status: AuditStatus.OK,
					actorUserId: { not: null },
				},
				_max: { createdAt: true },
			}),
		]);
		const authorOf = new Map(projects.map((row) => [row.id, row.authorId]));
		return edits.flatMap((row) =>
			row.entityId && authorOf.get(row.entityId) === row.actorUserId
				? [{ id: row.entityId, at: row._max.createdAt }]
				: [],
		);
	},
	equity: async (ids) => {
		const [equities, investors] = await Promise.all([
			prisma.projectEquity.findMany({
				where: { projectId: { in: ids } },
				select: {
					projectId: true,
					updatedAt: true,
					equityAllocations: { select: { updatedAt: true } },
				},
			}),
			prisma.teamInvestor.findMany({
				where: { team: { projectId: { in: ids } } },
				select: {
					createdAt: true,
					purchasedAt: true,
					team: { select: { projectId: true } },
				},
			}),
		]);
		return [
			...equities.map((row) => ({
				id: row.projectId,
				at: latestOf(
					row.updatedAt,
					...row.equityAllocations.map((a) => a.updatedAt),
				),
			})),
			...byTeamProject(investors, (row) =>
				latestOf(row.createdAt, row.purchasedAt),
			),
		];
	},
};

/** When each project was last worked on, by `PROJECT_ACTIVITY`. */
export const getLastProjectActivity = (projectIds: string[]) =>
	lastActivity(PROJECT_ACTIVITY, projectIds);
