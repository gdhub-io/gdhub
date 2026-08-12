import {
	AdviceRequestStatus,
	type Prisma,
	ProjectStatus,
} from "@gdhub-io/gdhub-prisma";
import dayjs from "dayjs";
import { z } from "zod";
import type { SpaceRole } from "@/config/permissions/roles";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import {
	ADVISOR_ROLE_COEF,
	ADVISOR_SESSION_TO_DAY_EQUIVALENT,
	ADVISOR_WEEKLY_SESSION_CAP,
	CORE_ROLE_COEF,
	getActiveDays,
	getAdvisorOutcomeCoef,
	getEntryStageCoef,
	getOutcomeCoef,
	LEADERSHIP_FINISH_BONUS_WEIGHT,
	LEADERSHIP_ROLE_COEF,
	STAGE_DEPTH_BONUS_WEIGHT,
} from "@/lib/skill-capital";
import { withSpaceGuard } from "@/lib/space-guard";
import {
	buildAdminUsersWhere,
	parseAdminUsersFilters,
	resolvePermissionGrants,
} from "@/repositories/admin-users.repository";
import { getBrevoContactEmails } from "@/services/brevo/sync";
import { prisma } from "@/services/prisma";

type SkillCapitalSummary = {
	scTotal: number;
	leadershipCapital: number;
	executionCapital: number;
	mentorshipCapital: number;
};

/** Membership chips: one per (space type, role), with how many spaces it covers. */
type MembershipSummary = {
	spaceType: string;
	role: SpaceRole;
	count: number;
};

type AdminUserListItem = {
	id: string;
	image: string | null;
	name: string;
	email: string | null;
	createdAt: Date;
	lastModifiedAt: Date;
	/** Id and name per speciality — the id opens that speciality's talent card. */
	specializations: { id: string; name: string }[];
	skillCapital: SkillCapitalSummary;
	memberships: MembershipSummary[];
	onboardingDone: boolean;
	/** Known to Brevo. `undefined` when Brevo could not be reached. */
	inBrevo?: boolean;
};

type PaginatedAdminUsersResponse = {
	data: AdminUserListItem[];
	meta: {
		currentPage: number;
		isFirstPage: boolean;
		isLastPage: boolean;
		previousPage: number | null;
		nextPage: number | null;
		pageCount?: number;
		totalCount?: number;
	};
};

type AdminUsersSortField =
	| "createdAt"
	| "lastModifiedAt"
	| "name"
	| "scTotal"
	| "leadershipCapital"
	| "executionCapital"
	| "mentorshipCapital";

type AdminUsersSortOrder = "ascend" | "descend";

type CapitalProjectAccumulator = {
	id: string;
	status: ProjectStatus;
	currentStepName?: string | null;
	roles: Set<string>;
	stepsCount: number;
	leadershipCapital: number;
	executionCapital: number;
	mentorshipCapital: number;
};

type UserSkillAccumulator = {
	leadershipCapitalRaw: number;
	startedAsAuthor: number;
	releasedAsAuthor: number;
	killedWithDignityAsAuthor: number;
	stageTouched: Set<string>;
	projectsById: Map<string, CapitalProjectAccumulator>;
};

type CapitalProject = {
	id: string;
	status: ProjectStatus;
	authorId: string;
	startedAt: Date | null;
	finishedAt: Date | null;
	dormantAt: Date | null;
	statusChangedAt: Date | null;
	archivedAt: Date | null;
	killedWithDignityAt: Date | null;
	workflow: {
		currentStep: { id: string; name: string; order: number } | null;
		steps: { id: string; name: string; order: number }[];
	} | null;
};

const AdminUsersQuerySchema = z.object({
	page: z.string().optional(),
	limit: z.string().optional(),
	sortField: z.string().optional(),
	sortOrder: z.string().optional(),
	search: z.string().optional(),
	spaceType: z.string().optional(),
	role: z.string().optional(),
	permission: z.string().optional(),
});

type AdminUsersQuery = z.infer<typeof AdminUsersQuerySchema>;

const toPositiveInt = (value: unknown, fallback: number) => {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return Math.floor(parsed);
};

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

/**
 * Cuts one page out of an already-sorted list, and describes it the way
 * `paginate().withPages()` would.
 *
 * The sorts that cannot be expressed in SQL — display name, last modified,
 * skill capital — read the whole filtered set and order it here, so they also
 * have to build the `meta` the client paginates by. That was three hand-written
 * copies of the same seven fields, each with its own chance of an off-by-one.
 */
const paginateInMemory = <T>(rows: T[], page: number, limit: number) => {
	const totalCount = rows.length;
	const pageCount = Math.max(Math.ceil(totalCount / limit), 1);
	const currentPage = clamp(page, 1, pageCount);
	const start = (currentPage - 1) * limit;

	return {
		rows: rows.slice(start, start + limit),
		meta: {
			currentPage,
			isFirstPage: currentPage === 1,
			isLastPage: currentPage >= pageCount,
			previousPage: currentPage > 1 ? currentPage - 1 : null,
			nextPage: currentPage < pageCount ? currentPage + 1 : null,
			pageCount,
			totalCount,
		},
	};
};

const isSortField = (value?: string): value is AdminUsersSortField =>
	[
		"createdAt",
		"lastModifiedAt",
		"name",
		"scTotal",
		"leadershipCapital",
		"executionCapital",
		"mentorshipCapital",
	].includes(value || "");

const isSortOrder = (value?: string): value is AdminUsersSortOrder =>
	value === "ascend" || value === "descend";

const USER_LIST_SELECT = {
	id: true,
	name: true,
	email: true,
	image: true,
	createdAt: true,
	updatedAt: true,
	onboardingDone: true,
	profile: { select: { name: true, updatedAt: true } },
	specialities: { select: { id: true, name: true, updatedAt: true } },
} satisfies Prisma.UserSelect;

const toDisplayName = (user: {
	profile: { name: string } | null;
	name: string | null;
	email: string | null;
}) => user.profile?.name || user.name || user.email || "—";

const toTimestamp = (value: Date | string | null | undefined) => {
	if (!value) return 0;
	return new Date(value).getTime();
};

const toLastModifiedAt = (user: {
	updatedAt: Date | string;
	profile: { updatedAt: Date | string } | null;
	specialities: { updatedAt: Date | string }[];
}) => {
	const timestamps = [
		toTimestamp(user.updatedAt),
		toTimestamp(user.profile?.updatedAt),
		...user.specialities.map((speciality) => toTimestamp(speciality.updatedAt)),
	];
	return new Date(Math.max(...timestamps));
};

const ensureUserAccumulator = (
	store: Map<string, UserSkillAccumulator>,
	userId: string,
) => {
	const existing = store.get(userId);
	if (existing) return existing;

	const created: UserSkillAccumulator = {
		leadershipCapitalRaw: 0,
		startedAsAuthor: 0,
		releasedAsAuthor: 0,
		killedWithDignityAsAuthor: 0,
		stageTouched: new Set<string>(),
		projectsById: new Map<string, CapitalProjectAccumulator>(),
	};
	store.set(userId, created);
	return created;
};

const ensureProjectAccumulator = ({
	store,
	project,
	role,
}: {
	store: Map<string, CapitalProjectAccumulator>;
	project: CapitalProject;
	role?: string;
}) => {
	const existing = store.get(project.id);
	if (existing) {
		if (role) existing.roles.add(role);
		return existing;
	}

	const created: CapitalProjectAccumulator = {
		id: project.id,
		status: project.status,
		currentStepName: project.workflow?.currentStep?.name,
		roles: new Set(role ? [role] : []),
		stepsCount: project.workflow?.steps?.length ?? 0,
		leadershipCapital: 0,
		executionCapital: 0,
		mentorshipCapital: 0,
	};

	store.set(project.id, created);
	return created;
};

const computeSkillCapitalForUsers = async (
	userIds: string[],
): Promise<Map<string, SkillCapitalSummary>> => {
	if (userIds.length === 0) return new Map();

	const [teamMembers, authoredProjects, completedAdviceRequests] =
		await Promise.all([
			prisma.teamMember.findMany({
				where: { userId: { in: userIds } },
				include: {
					enteredProjectStep: {
						select: { id: true, name: true, order: true },
					},
					leftProjectStep: { select: { id: true, name: true, order: true } },
					team: {
						select: {
							project: {
								select: {
									id: true,
									status: true,
									authorId: true,
									startedAt: true,
									finishedAt: true,
									dormantAt: true,
									statusChangedAt: true,
									archivedAt: true,
									killedWithDignityAt: true,
									workflow: {
										select: {
											currentStep: {
												select: { id: true, name: true, order: true },
											},
											steps: {
												select: { id: true, name: true, order: true },
											},
										},
									},
								},
							},
						},
					},
				},
			}),
			prisma.project.findMany({
				where: { authorId: { in: userIds } },
				select: {
					id: true,
					status: true,
					authorId: true,
					startedAt: true,
					finishedAt: true,
					dormantAt: true,
					statusChangedAt: true,
					archivedAt: true,
					killedWithDignityAt: true,
					workflow: {
						select: {
							currentStep: { select: { id: true, name: true, order: true } },
							steps: { select: { id: true, name: true, order: true } },
						},
					},
				},
			}),
			prisma.adviceRequest.findMany({
				where: {
					toUserId: { in: userIds },
					status: {
						in: [AdviceRequestStatus.Closed, AdviceRequestStatus.Executed],
					},
					projectId: { not: null },
					finishedAt: { not: null },
				},
				orderBy: { finishedAt: "asc" },
				select: {
					toUserId: true,
					projectId: true,
					createdAt: true,
					finishedAt: true,
					project: {
						select: {
							id: true,
							status: true,
							authorId: true,
							startedAt: true,
							finishedAt: true,
							dormantAt: true,
							statusChangedAt: true,
							archivedAt: true,
							killedWithDignityAt: true,
							workflow: {
								select: {
									currentStep: {
										select: { id: true, name: true, order: true },
									},
									steps: { select: { id: true, name: true, order: true } },
								},
							},
						},
					},
				},
			}),
		]);

	const userData = new Map<string, UserSkillAccumulator>();
	for (const userId of userIds) {
		ensureUserAccumulator(userData, userId);
	}

	for (const project of authoredProjects) {
		const data = ensureUserAccumulator(userData, project.authorId);
		data.startedAsAuthor += 1;
		if (project.status === ProjectStatus.Released) {
			data.releasedAsAuthor += 1;
		}
		if (project.status === ProjectStatus.KilledWithDignity) {
			data.killedWithDignityAsAuthor += 1;
		}

		const accumulator = ensureProjectAccumulator({
			store: data.projectsById,
			project,
			role: "Author",
		});

		const firstWorkflowStep = project.workflow?.steps?.slice().sort((a, b) => {
			const aOrder = a.order ?? 0;
			const bOrder = b.order ?? 0;
			return aOrder - bOrder;
		})[0];

		const entryCoef = getEntryStageCoef(
			firstWorkflowStep ?? project.workflow?.currentStep,
			project.workflow?.steps?.length ?? 0,
		);

		const activeDays = getActiveDays({
			startedAt: project.startedAt,
			finishedAt: project.finishedAt,
			status: project.status,
			dormantAt: project.dormantAt,
			statusChangedAt: project.statusChangedAt,
			archivedAt: project.archivedAt,
			killedWithDignityAt: project.killedWithDignityAt,
			projectFinishedAt: project.finishedAt,
		});

		const projectLeadershipCapital =
			activeDays *
			entryCoef *
			LEADERSHIP_ROLE_COEF *
			getOutcomeCoef(project.status);

		data.leadershipCapitalRaw += projectLeadershipCapital;
		accumulator.leadershipCapital += projectLeadershipCapital;
	}

	for (const member of teamMembers) {
		const userId = member.userId;
		const project = member.team?.project;
		if (!project) continue;

		const data = ensureUserAccumulator(userData, userId);

		if (project.authorId === userId) {
			const authorProject = ensureProjectAccumulator({
				store: data.projectsById,
				project,
				role: "Author",
			});
			authorProject.roles.add("Team");
			continue;
		}

		const accumulator = ensureProjectAccumulator({
			store: data.projectsById,
			project,
			role: "Team",
		});

		const stepsCount = project.workflow?.steps?.length ?? 0;
		const entryCoef = getEntryStageCoef(
			member.enteredProjectStep ?? project.workflow?.currentStep,
			stepsCount,
		);

		const activeDays = getActiveDays({
			startedAt: member.startedAt,
			finishedAt: member.finishedAt,
			status: project.status,
			dormantAt: project.dormantAt,
			statusChangedAt: project.statusChangedAt,
			archivedAt: project.archivedAt,
			killedWithDignityAt: project.killedWithDignityAt,
			projectFinishedAt: project.finishedAt,
		});

		const projectExecutionCapital =
			activeDays * entryCoef * CORE_ROLE_COEF * getOutcomeCoef(project.status);

		accumulator.executionCapital += projectExecutionCapital;

		if (member.enteredProjectStep?.id)
			data.stageTouched.add(member.enteredProjectStep.id);
		if (member.leftProjectStep?.id)
			data.stageTouched.add(member.leftProjectStep.id);
		if (project.workflow?.currentStep?.id)
			data.stageTouched.add(project.workflow.currentStep.id);
	}

	const acceptedSessionsByProjectWeek = new Map<string, number>();
	const acceptedSessionsByProject = new Map<string, number>();

	for (const adviceRequest of completedAdviceRequests) {
		const userId = adviceRequest.toUserId;
		const project = adviceRequest.project;
		if (!project || !adviceRequest.projectId) continue;

		const weekKey = dayjs(adviceRequest.finishedAt ?? adviceRequest.createdAt)
			.startOf("week")
			.toISOString();
		const projectWeekKey = `${userId}:${adviceRequest.projectId}:${weekKey}`;
		const weekCount = acceptedSessionsByProjectWeek.get(projectWeekKey) ?? 0;
		if (weekCount >= ADVISOR_WEEKLY_SESSION_CAP) continue;

		acceptedSessionsByProjectWeek.set(projectWeekKey, weekCount + 1);

		const projectCountKey = `${userId}:${adviceRequest.projectId}`;
		acceptedSessionsByProject.set(
			projectCountKey,
			(acceptedSessionsByProject.get(projectCountKey) ?? 0) + 1,
		);

		const data = ensureUserAccumulator(userData, userId);
		ensureProjectAccumulator({
			store: data.projectsById,
			project,
			role: "Mentor",
		});
	}

	for (const [key, sessionsCount] of acceptedSessionsByProject.entries()) {
		const [userId, projectId] = key.split(":");
		if (!userId || !projectId) continue;

		const data = userData.get(userId);
		if (!data) continue;
		const projectAccumulator = data.projectsById.get(projectId);
		if (!projectAccumulator) continue;

		const projectMentorshipCapital =
			sessionsCount *
			ADVISOR_SESSION_TO_DAY_EQUIVALENT *
			ADVISOR_ROLE_COEF *
			getAdvisorOutcomeCoef(projectAccumulator.status);

		projectAccumulator.mentorshipCapital += projectMentorshipCapital;
	}

	const result = new Map<string, SkillCapitalSummary>();

	for (const userId of userIds) {
		const data = userData.get(userId);
		if (!data) {
			result.set(userId, {
				scTotal: 0,
				leadershipCapital: 0,
				executionCapital: 0,
				mentorshipCapital: 0,
			});
			continue;
		}

		const projects = Array.from(data.projectsById.values());

		const executionCapitalRaw = projects.reduce(
			(sum, project) => sum + project.executionCapital,
			0,
		);
		const maxCoreSteps = projects.reduce(
			(max, project) =>
				project.executionCapital > 0 && project.stepsCount > max
					? project.stepsCount
					: max,
			0,
		);
		const stageDepthScore =
			maxCoreSteps > 0 ? data.stageTouched.size / maxCoreSteps : 0;
		const stageDepthBonus = stageDepthScore * STAGE_DEPTH_BONUS_WEIGHT;

		const riAuthorDenominator = Math.max(
			data.startedAsAuthor - data.killedWithDignityAsAuthor,
			0,
		);
		const riAuthor =
			riAuthorDenominator > 0 ? data.releasedAsAuthor / riAuthorDenominator : 0;
		const leadershipFinishBonus = riAuthor * LEADERSHIP_FINISH_BONUS_WEIGHT;

		const leadershipCapital = data.leadershipCapitalRaw + leadershipFinishBonus;
		const executionCapital = executionCapitalRaw + stageDepthBonus;
		const mentorshipCapital = projects.reduce(
			(sum, project) => sum + project.mentorshipCapital,
			0,
		);
		const scTotal = leadershipCapital + executionCapital + mentorshipCapital;

		result.set(userId, {
			scTotal: Math.round(scTotal),
			leadershipCapital: Math.round(leadershipCapital),
			executionCapital: Math.round(executionCapital),
			mentorshipCapital: Math.round(mentorshipCapital),
		});
	}

	return result;
};

const EMPTY_CAPITAL: SkillCapitalSummary = {
	scTotal: 0,
	leadershipCapital: 0,
	executionCapital: 0,
	mentorshipCapital: 0,
};

/** Membership chips for a page of users, in one query. */
const loadMemberships = async (
	userIds: string[],
): Promise<Map<string, MembershipSummary[]>> => {
	if (userIds.length === 0) return new Map();

	const grouped = await prisma.spaceMember.groupBy({
		by: ["userId", "spaceType", "role"],
		where: { userId: { in: userIds }, revokedAt: null },
		_count: { _all: true },
	});

	const byUserId = new Map<string, MembershipSummary[]>();

	for (const row of grouped) {
		const list = byUserId.get(row.userId) ?? [];

		list.push({
			spaceType: row.spaceType,
			role: row.role,
			count: row._count._all,
		});
		byUserId.set(row.userId, list);
	}

	return byUserId;
};

type UserRecord = {
	id: string;
	name: string | null;
	email: string | null;
	image: string | null;
	createdAt: Date;
	updatedAt: Date;
	onboardingDone: boolean;
	profile: { name: string; updatedAt: Date | string } | null;
	specialities: { id: string; name: string; updatedAt: Date | string }[];
};

const toListItem = (
	user: UserRecord,
	skillCapital: Map<string, SkillCapitalSummary>,
	memberships: Map<string, MembershipSummary[]>,
): AdminUserListItem => ({
	id: user.id,
	image: user.image,
	name: toDisplayName(user),
	email: user.email,
	createdAt: user.createdAt,
	lastModifiedAt: toLastModifiedAt(user),
	specializations: user.specialities.map((speciality) => ({
		id: speciality.id,
		name: speciality.name,
	})),
	skillCapital: skillCapital.get(user.id) || EMPTY_CAPITAL,
	memberships: memberships.get(user.id) || [],
	onboardingDone: user.onboardingDone,
});

/** Skill capital and memberships for one page, together. */
const loadPageData = async (users: UserRecord[]) =>
	Promise.all([
		computeSkillCapitalForUsers(users.map((user) => user.id)),
		loadMemberships(users.map((user) => user.id)),
	]);

/**
 * Marks which rows Brevo already knows about.
 *
 * Brevo has no bulk "do these exist" call, so the whole contact list is read
 * once (and cached) and matched here rather than asking per row — a page of a
 * hundred users would otherwise be a hundred round trips.
 *
 * Fails soft: the admin table is about users, not about the mailing platform,
 * and it must still render when Brevo is down. Rows then carry no flag at all,
 * which the UI shows as unknown rather than as absent.
 */
const withBrevoPresence = async (
	response: PaginatedAdminUsersResponse,
): Promise<PaginatedAdminUsersResponse> => {
	try {
		const contacts = await getBrevoContactEmails();

		return {
			...response,
			data: response.data.map((user) => ({
				...user,
				inBrevo: user.email
					? contacts.has(user.email.toLowerCase())
					: undefined,
			})),
		};
	} catch (error) {
		console.error("[brevo: presence lookup]", error);
		return response;
	}
};

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.users.view" }),
	withValidation(AdminUsersQuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const {
		page: pageQuery,
		limit: limitQuery,
		sortField: sortFieldQuery,
		sortOrder: sortOrderQuery,
		search: searchQuery,
		spaceType: spaceTypeQuery,
		role: roleQuery,
		permission: permissionQuery,
	} = body as AdminUsersQuery;

	const page = toPositiveInt(pageQuery, 1);
	const limit = clamp(toPositiveInt(limitQuery, 20), 1, 100);
	const sortField = isSortField(sortFieldQuery) ? sortFieldQuery : undefined;
	const sortOrder = isSortOrder(sortOrderQuery) ? sortOrderQuery : undefined;
	const permission = permissionQuery?.trim() || undefined;
	const where = buildAdminUsersWhere({
		...parseAdminUsersFilters({
			search: searchQuery,
			spaceType: spaceTypeQuery,
			role: roleQuery,
		}),
		permissionGrants: permission
			? await resolvePermissionGrants(permission)
			: undefined,
	});

	if (sortField && sortOrder) {
		if (sortField === "createdAt") {
			const [users, meta] = await prisma.user
				.paginate({
					where,
					select: USER_LIST_SELECT,
					orderBy: { createdAt: sortOrder === "ascend" ? "asc" : "desc" },
				})
				.withPages({
					page,
					limit,
					includePageCount: true,
				});

			const [capital, memberships] = await loadPageData(users);

			const response: PaginatedAdminUsersResponse = {
				data: users.map((user) => toListItem(user, capital, memberships)),
				meta,
			};
			return json(await withBrevoPresence(response));
		}

		const allUsers = await prisma.user.findMany({
			where,
			select: USER_LIST_SELECT,
			orderBy: { createdAt: "desc" },
		});

		const sortedUsers = [...allUsers];
		const direction = sortOrder === "ascend" ? 1 : -1;

		// Neither of these is a column: a display name falls back through three
		// fields, and "last modified" is the newest of the user's own row, their
		// profile and their specialities. Both are worked out here and sorted in
		// memory, the way the skill capital sorts below already are.
		if (sortField === "name" || sortField === "lastModifiedAt") {
			sortedUsers.sort((a, b) => {
				if (sortField === "lastModifiedAt") {
					return (
						(toLastModifiedAt(a).getTime() - toLastModifiedAt(b).getTime()) *
						direction
					);
				}

				return (
					toDisplayName(a).localeCompare(toDisplayName(b), undefined, {
						sensitivity: "base",
					}) * direction
				);
			});

			const { rows: pagedUsers, meta } = paginateInMemory(
				sortedUsers,
				page,
				limit,
			);
			const [capital, memberships] = await loadPageData(pagedUsers);

			const response: PaginatedAdminUsersResponse = {
				data: pagedUsers.map((user) => toListItem(user, capital, memberships)),
				meta,
			};
			return json(await withBrevoPresence(response));
		}

		const skillCapitalByUserId = await computeSkillCapitalForUsers(
			allUsers.map((user) => user.id),
		);

		sortedUsers.sort((a, b) => {
			const aValue = skillCapitalByUserId.get(a.id)?.[sortField] || 0;
			const bValue = skillCapitalByUserId.get(b.id)?.[sortField] || 0;
			return (aValue - bValue) * direction;
		});

		const { rows: pagedUsers, meta } = paginateInMemory(
			sortedUsers,
			page,
			limit,
		);
		const memberships = await loadMemberships(
			pagedUsers.map((user) => user.id),
		);

		const response: PaginatedAdminUsersResponse = {
			data: pagedUsers.map((user) =>
				toListItem(user, skillCapitalByUserId, memberships),
			),
			meta,
		};
		return json(await withBrevoPresence(response));
	}

	const [users, meta] = await prisma.user
		.paginate({
			where,
			select: USER_LIST_SELECT,
			orderBy: { createdAt: "desc" },
		})
		.withPages({
			page,
			limit,
			includePageCount: true,
		});

	const [capital, memberships] = await loadPageData(users);

	const response: PaginatedAdminUsersResponse = {
		data: users.map((user) => toListItem(user, capital, memberships)),
		meta,
	};
	return json(await withBrevoPresence(response));
});
