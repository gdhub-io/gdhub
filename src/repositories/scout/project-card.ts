import {
	CheckpointCuratorKind,
	CheckpointStatus,
	CheckpointVerdict,
} from "@/config/prisma-enums";
import { totalPerCurrency } from "@/helpers/investment";
import { checkpointDay } from "@/lib/checkpoints/days";
import { sprintDirections } from "@/lib/checkpoints/picture";
import {
	CHECKPOINT_RUNNING_STATUSES,
	UNNUMBERED_STATUSES,
} from "@/lib/checkpoints/status";
import { checkpointNumbers } from "@/repositories/checkpoints/number";
import {
	CONFIRMED_MEMBERS,
	CONFIRMED_STATUS,
} from "@/repositories/project/team";
import { estimateInvestment } from "@/services/investment/estimate";
import { prisma } from "@/services/prisma";
import type { DirectionRead } from "@/types/checkpoints";
import { toEstimateInput, VISIBLE_STATUSES } from "./games";

/**
 * The project a scout may open, or `null`.
 *
 * The same visibility the list uses: a card must never open a project the
 * table would not have offered.
 */
export const visibleProjectId = async (id: string) =>
	prisma.project.findFirst({
		where: { id, status: { in: VISIBLE_STATUSES } },
		select: { id: true },
	});

const featuredSpeciality = {
	where: { isFeatured: true },
	take: 1,
	select: { name: true, level: true },
} as const;

type EquityRow = {
	platformShare: number;
	mentorFundShare: number;
	investmentReserve: number;
	equityAllocations: { percentage: number }[];
};

/**
 * The cap table as four numbers.
 *
 * `unallocated` is what is left after the three reserves and every allocation
 * already handed out — the same arithmetic the founder's equity plot does, so
 * the scout and the author read one cap table and not two.
 */
const equitySplit = (equity: EquityRow | null) => {
	if (!equity) return null;

	const allocated =
		equity.platformShare +
		equity.mentorFundShare +
		equity.investmentReserve +
		equity.equityAllocations.reduce((sum, row) => sum + row.percentage, 0);

	return {
		investmentReserve: equity.investmentReserve,
		unallocated: Math.max(0, Math.round((100 - allocated) * 10) / 10),
	};
};

/** Header and Overview: what the card shows before any tab is opened. */
export async function getProjectCardOverview(id: string) {
	const project = await prisma.project.findFirst({
		where: { id, status: { in: VISIBLE_STATUSES } },
		select: {
			id: true,
			name: true,
			slug: true,
			description: true,
			coverImage: true,
			videoLink: true,
			startedAt: true,
			updatedAt: true,
			genre: true,
			platform: true,
			setting: true,
			visualStyle: true,
			audition: true,
			author: {
				select: {
					id: true,
					name: true,
					image: true,
					specialities: featuredSpeciality,
				},
			},
			links: true,
			equity: {
				select: {
					platformShare: true,
					mentorFundShare: true,
					investmentReserve: true,
					equityAllocations: { select: { percentage: true } },
				},
			},
			workflow: {
				select: {
					currentStep: { select: { name: true, order: true, plannedAt: true } },
					steps: {
						orderBy: { order: "asc" },
						select: {
							name: true,
							order: true,
							done: true,
							// The workflow already decides what "the settings are
							// filled in" means, and the author is already looking at
							// that verdict — the card reads it rather than inventing a
							// second definition that can disagree with it. Filtered on
							// the condition and not the title: names are editable and
							// translated, `project_fields` is what the platform
							// evaluates — and filtering in SQL returns one row instead
							// of every task of every step.
							tasks: {
								where: {
									condition: { path: ["source"], equals: "project_fields" },
								},
								take: 1,
								select: { name: true },
							},
						},
					},
				},
			},
			team: {
				select: {
					members: {
						where: CONFIRMED_MEMBERS,
						orderBy: { startedAt: "asc" },
						select: {
							id: true,
							user: {
								select: {
									id: true,
									name: true,
									image: true,
									profile: { select: { timeForWork: true } },
								},
							},
							speciality: { select: { level: true } },
						},
					},
					_count: {
						select: {
							investors: true,
							vacancies: { where: { status: "Published" } },
						},
					},
				},
			},
			_count: { select: { estimations: true, reports: true } },
			reports: {
				where: { isSystem: false },
				orderBy: { publishedAt: "desc" },
				take: 1,
				select: {
					id: true,
					publishedAt: true,
					content: true,
					author: { select: { name: true } },
				},
			},
		},
	});

	if (!project) return null;

	const members = project.team?.members ?? [];
	const steps = project.workflow?.steps ?? [];
	const currentStep = project.workflow?.currentStep ?? null;

	return {
		id: project.id,
		name: project.name,
		slug: project.slug,
		description: project.description,
		coverImage: project.coverImage,
		videoLink: project.videoLink,
		startedAt: project.startedAt,
		updatedAt: project.updatedAt,
		details: {
			genre: project.genre,
			platform: project.platform,
			setting: project.setting,
			visualStyle: project.visualStyle,
			audition: project.audition,
		},
		author: {
			id: project.author.id,
			name: project.author.name,
			image: project.author.image,
			speciality: project.author.specialities[0] ?? null,
		},
		links: project.links,
		stage: currentStep?.name ?? null,
		stageDeadline: currentStep?.plannedAt ?? null,
		/** The stage the project opened at, under the date it started. */
		startedStage: steps[0]?.name ?? null,
		/** The task a scout is told to wait on when Game details is empty. */
		detailsTask: steps.flatMap((step) => step.tasks)[0]?.name ?? null,
		equity: equitySplit(project.equity),
		teamSize: members.length,
		investorCount: project.team?._count.investors ?? 0,
		/** Faces for the stack on the Team card, in the order they joined. */
		teamFaces: members.slice(0, 4).map((member) => ({
			id: member.id,
			name: member.user.name,
			image: member.user.image,
		})),
		// The same estimate the games table shows, so the ROUND card and the
		// column a scout arrived from cannot disagree.
		estimate: estimateInvestment(toEstimateInput(project)),
		reviewCount: project._count.estimations,
		latestDevlog: project.reports[0] ?? null,
	};
}

export async function getProjectCardTeam(id: string) {
	const project = await prisma.project.findFirst({
		where: { id },
		select: {
			team: {
				select: {
					// Everyone who was ever really on this team, not only the people
					// on it today: a scout reading four names cannot tell a team
					// that grew from one that has been through eleven people, and
					// `CONFIRMED_MEMBERS` hides the ones who left.
					members: {
						where: { status: CONFIRMED_MEMBERS.status },
						// Postgres sorts NULLs last on ASC, and a null `finishedAt` is
						// exactly the person still on the team — so say `nulls: "first"`.
						orderBy: [
							{ finishedAt: { sort: "asc", nulls: "first" } },
							{ startedAt: "asc" },
						],
						select: {
							id: true,
							position: true,
							status: true,
							startedAt: true,
							finishedAt: true,
							user: {
								select: {
									id: true,
									name: true,
									image: true,
									profile: { select: { timeForWork: true } },
								},
							},
							speciality: { select: { name: true, level: true } },
						},
					},
				},
			},
		},
	});

	// A bare array, like every other section: only `team` had an envelope, and
	// it bought a wrapper type and an unwrap at each call site.
	return (project?.team?.members ?? []).map((member) => ({
		id: member.id,
		name: member.user.name,
		image: member.user.image,
		position: member.position,
		speciality: member.speciality,
		// Hours a week is the only commitment signal the platform collects.
		hoursPerWeek: member.user.profile?.timeForWork ?? null,
		isFounder: member.status === "Founder",
		startedAt: member.startedAt,
		finishedAt: member.finishedAt,
	}));
}

/**
 * The "To release" column, in full.
 *
 * The same three groups the games table shows behind its info icon: what the
 * team says it wants, what the platform worked out on its own, and what has
 * actually changed hands. Built from the same estimator the column sorts by, so
 * the tab cannot quote a different number than the row the scout arrived from.
 */
export async function getProjectCardInvestment(id: string) {
	const project = await prisma.project.findFirst({
		where: { id },
		select: {
			workflow: {
				select: {
					currentStep: { select: { order: true } },
					steps: {
						orderBy: { order: "asc" },
						select: { name: true, order: true, done: true },
					},
				},
			},
			// The cap table as the founder's own equity plot reads it: vested
			// allocations and the promises on top of them, so the scout sees the
			// same bar the team does rather than a summary of it.
			equity: {
				select: {
					platformShare: true,
					mentorFundShare: true,
					investmentReserve: true,
					equityAllocations: {
						select: {
							id: true,
							percentage: true,
							isFixed: true,
							teamMemberId: true,
							owner: { select: { id: true, name: true } },
							promises: {
								where: { isExecuted: false },
								select: { percentage: true },
							},
						},
					},
				},
			},
			team: {
				select: {
					members: {
						where: CONFIRMED_MEMBERS,
						select: {
							speciality: { select: { level: true } },
							user: { select: { profile: { select: { timeForWork: true } } } },
						},
					},
					// No `name` and no `comment`: the tab numbers investors rather
					// than naming them, and PII is cheaper not to read than to read
					// and strip.
					investors: {
						orderBy: { createdAt: "asc" },
						select: { id: true, share: true, value: true, currency: true },
					},
					_count: {
						select: {
							investors: true,
							vacancies: { where: { status: "Published" } },
						},
					},
				},
			},
		},
	});

	return {
		// What the team says it is looking for. Always null today: the schema
		// carries no such field. The scout reads the dash for what it is — the
		// team has not said — and has the estimate to fall back on.
		stated: null,
		raised: totalPerCurrency(project?.team?.investors ?? []),
		investorCount: project?.team?._count.investors ?? 0,
		// Numbered, not named. The tab answers "how much has gone in", and an
		// investor's name is a contact a scout could work around the author with.
		investors: (project?.team?.investors ?? []).map((investor, index) => ({
			id: investor.id,
			index: index + 1,
			share: investor.share,
		})),
		equity: project?.equity
			? {
					platformShare: project.equity.platformShare,
					mentorFundShare: project.equity.mentorFundShare,
					investmentReserve: project.equity.investmentReserve,
					shares: project.equity.equityAllocations.flatMap((allocation) => {
						const owner = {
							memberId: allocation.teamMemberId ?? allocation.id,
							userId: allocation.owner.id,
							name: allocation.owner.name,
							isFixed: allocation.isFixed,
						};
						const promised = allocation.promises.reduce(
							(sum, promise) => sum + promise.percentage,
							0,
						);

						return [
							...(allocation.percentage > 0
								? [
										{
											...owner,
											percentage: allocation.percentage,
											vested: true,
										},
									]
								: []),
							...(promised > 0
								? [{ ...owner, percentage: promised, vested: false }]
								: []),
						];
					}),
				}
			: null,
		estimate: project ? estimateInvestment(toEstimateInput(project)) : null,
	};
}

/** The page size a section falls back to when the caller does not ask. */
const SECTION_LIMIT = 50;

export async function getProjectCardFiles(id: string, limit = SECTION_LIMIT) {
	return prisma.projectArtifact.findMany({
		where: { projectId: id },
		orderBy: { updatedAt: "desc" },
		take: limit,
		select: {
			id: true,
			name: true,
			type: true,
			link: true,
			updatedAt: true,
			createdByUser: { select: { name: true } },
		},
	});
}

export async function getProjectCardWorkflow(id: string) {
	const [workflow, checkpoints] = await Promise.all([
		prisma.projectWorkflow.findFirst({
			where: { projectId: id },
			select: {
				currentStepId: true,
				steps: {
					orderBy: { order: "asc" },
					select: {
						id: true,
						name: true,
						order: true,
						done: true,
						plannedAt: true,
						finishedAt: true,
					},
				},
			},
		}),
		prisma.projectCheckpoint.findMany({
			where: {
				projectId: id,
				status: CheckpointStatus.Closed,
				verdict: CheckpointVerdict.StageClosed,
			},
			select: {
				id: true,
				projectId: true,
				createdAt: true,
				stepId: true,
				curatorKind: true,
				curator: { select: { name: true } },
			},
		}),
	]);

	// A stage left after a "Ready for the next stage" verdict says whose; any
	// other stage left was closed by its own tasks (GDHUB-37).
	const numbers = await checkpointNumbers(checkpoints);
	const closedAfter = new Map(
		checkpoints.flatMap((checkpoint) =>
			checkpoint.stepId
				? [
						[
							checkpoint.stepId,
							{
								number: numbers.get(checkpoint.id) ?? 1,
								curator:
									checkpoint.curatorKind === CheckpointCuratorKind.AI
										? null
										: (checkpoint.curator?.name ?? null),
							},
						] as const,
					]
				: [],
		),
	);

	return (workflow?.steps ?? []).map((step) => ({
		...step,
		isCurrent: step.id === workflow?.currentStepId,
		closedBy: step.finishedAt ? (closedAfter.get(step.id) ?? "tasks") : null,
	}));
}

/**
 * The project's checkpoints as their curators judged them (GDHUB-44), newest
 * first. A select, never an include: the author's rating, the call notes, the
 * journal and the money stay out of a scout's reach by never being read.
 */
export async function getProjectCardCheckpoints(id: string) {
	const rows = await prisma.projectCheckpoint.findMany({
		where: { projectId: id, status: { notIn: UNNUMBERED_STATUSES } },
		orderBy: { createdAt: "asc" },
		select: {
			id: true,
			status: true,
			stageName: true,
			goal: true,
			startedAt: true,
			dueAt: true,
			verdict: true,
			verdictNote: true,
			curatorKind: true,
			curator: {
				select: {
					name: true,
					image: true,
					profile: { select: { name: true } },
					specialities: {
						orderBy: [{ isOpenForMentoring: "desc" }, { isFeatured: "desc" }],
						take: 1,
						select: { id: true, name: true, level: true },
					},
				},
			},
			sessions: { select: { index: true, content: true } },
		},
	});

	// Numbered among every checkpoint that ran, as everywhere else; listed are only
	// the ones running or closed — one waiting for its curator has nothing to show.
	return rows
		.map((row, index) => ({ row, number: index + 1 }))
		.filter(({ row }) => LISTED_CHECKPOINTS.includes(row.status))
		.reverse()
		.map(({ row, number }) => {
			const closed = row.status === CheckpointStatus.Closed;
			const speciality = row.curator?.specialities[0] ?? null;
			return {
				id: row.id,
				number,
				stage: row.stageName,
				goal: row.goal,
				running: !closed,
				startedAt: row.startedAt,
				dueAt: row.dueAt,
				day: !closed && row.startedAt ? checkpointDay(row.startedAt) : null,
				verdict: closed ? row.verdict : null,
				verdictNote: closed ? row.verdictNote : null,
				curator:
					row.curatorKind === CheckpointCuratorKind.AI
						? null
						: {
								name: row.curator?.profile?.name ?? row.curator?.name ?? null,
								image: row.curator?.image ?? null,
								speciality,
							},
				directions: closed
					? sprintDirections(row.sessions).map(({ sprint, direction }) => ({
							sprint,
							goal: readOf(direction.goal),
							stage: readOf(direction.stage),
						}))
					: [],
			};
		});
}

/** The direction without its confirmation stamp: who confirmed it is not the scout's. */
const readOf = ({ value, why }: DirectionRead) => ({ value, why });

const LISTED_CHECKPOINTS: CheckpointStatus[] = [
	...CHECKPOINT_RUNNING_STATUSES,
	CheckpointStatus.Closed,
];

/**
 * The project's log: everything the platform stamps with a date.
 *
 * Five sources rather than the two the first cut had — a scout reading the log
 * wants the build that landed and the person who joined, not only the devlogs.
 * Each source is asked for `limit` rows and the merge keeps the newest, so the
 * cost does not grow with the age of the project.
 */
export async function getProjectCardActivities(
	id: string,
	limit = SECTION_LIMIT,
) {
	const [project, posts, steps, files, members] = await Promise.all([
		prisma.project.findFirst({
			where: { id },
			select: { createdAt: true, author: { select: { name: true } } },
		}),
		prisma.projectReport.findMany({
			where: { projectId: id, isSystem: false },
			orderBy: { publishedAt: "desc" },
			take: limit,
			select: {
				id: true,
				publishedAt: true,
				author: { select: { name: true } },
			},
		}),
		prisma.projectWorkflowStep.findMany({
			where: { projectWorkflow: { projectId: id }, finishedAt: { not: null } },
			orderBy: { finishedAt: "desc" },
			take: limit,
			select: { id: true, name: true, finishedAt: true },
		}),
		prisma.projectArtifact.findMany({
			where: { projectId: id },
			orderBy: { createdAt: "desc" },
			take: limit,
			select: {
				id: true,
				name: true,
				type: true,
				createdAt: true,
				createdByUser: { select: { name: true } },
			},
		}),
		prisma.teamMember.findMany({
			where: { team: { projectId: id }, ...CONFIRMED_STATUS },
			orderBy: { startedAt: "desc" },
			take: limit,
			select: {
				id: true,
				startedAt: true,
				user: { select: { name: true } },
			},
		}),
	]);

	// The log's own floor. Registration is by definition the first thing that
	// happened, so it sorts last however the other stamps fall — a founder whose
	// membership is stamped a second before the project row would otherwise read
	// as having joined a project that did not exist yet.
	const at = (row: { at: Date; kind: string }) =>
		row.kind === "created" ? Number.NEGATIVE_INFINITY : row.at.getTime();

	return [
		...(project
			? [
					{
						id: "project-created",
						at: project.createdAt,
						kind: "created" as const,
						subject: null,
						author: project.author?.name ?? null,
					},
				]
			: []),
		...posts.map((post) => ({
			id: `devlog-${post.id}`,
			at: post.publishedAt,
			kind: "devlog" as const,
			subject: null,
			author: post.author?.name ?? null,
		})),
		...steps.map((step) => ({
			id: `step-${step.id}`,
			at: step.finishedAt as Date,
			kind: "step" as const,
			subject: step.name,
			author: null,
		})),
		...files.map((file) => ({
			id: `file-${file.id}`,
			at: file.createdAt,
			kind: "file" as const,
			subject: file.name ?? file.type,
			author: file.createdByUser?.name ?? null,
		})),
		...members.map((member) => ({
			id: `member-${member.id}`,
			at: member.startedAt,
			kind: "member" as const,
			subject: member.user.name,
			author: null,
		})),
	]
		.sort((a, b) => at(b) - at(a))
		.slice(0, limit);
}

export async function getProjectCardReviews(id: string, limit = SECTION_LIMIT) {
	const reviews = await prisma.projectEstimation.findMany({
		where: { projectId: id },
		take: limit,
		select: {
			id: true,
			notes: true,
			isApproved: true,
			expert: {
				select: {
					id: true,
					name: true,
					image: true,
					specialities: featuredSpeciality,
				},
			},
		},
	});

	return reviews.map((review) => ({
		id: review.id,
		notes: review.notes,
		isApproved: review.isApproved,
		expert: {
			id: review.expert.id,
			name: review.expert.name,
			image: review.expert.image,
			speciality: review.expert.specialities[0] ?? null,
		},
	}));
}
