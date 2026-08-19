import { ProjectStatus, TeamMemberStatus } from "@gdhub-io/gdhub-prisma";
import type { SkillLevel } from "@/config/prisma-enums";
import { prisma } from "@/services/prisma";

/** Projects a scout would not act on: finished, shelved or turned down. */
export const VISIBLE_STATUSES = [
	ProjectStatus.Registered,
	ProjectStatus.Approved,
	ProjectStatus.Released,
];

/**
 * Someone who was really on the team rather than an applicant or a rejection —
 * whether or not they are still on it.
 */
export const CONFIRMED_STATUS = {
	// Not `as const`: Prisma's `in` wants a mutable array, and a readonly tuple
	// makes it fall back to the overload without `select`, silently widening
	// every row to the whole Project model.
	status: { in: [TeamMemberStatus.Hired, TeamMemberStatus.Founder] },
};

/**
 * The team as it stands today. Without `finishedAt`, a departed member still
 * counts towards the team size and the seats the investment estimate prices —
 * so anything sizing the team wants this, and anything telling its history
 * wants `CONFIRMED_STATUS`.
 */
export const CONFIRMED_MEMBERS = { ...CONFIRMED_STATUS, finishedAt: null };

/**
 * The estimator's input, assembled once.
 *
 * The games table and the card both quote this figure, and a scout opens the
 * card from the row — so they read the same number or the feature is broken.
 * Keeping the mapping here is what makes that structural instead of a habit.
 */
export const toEstimateInput = (project: {
	team?: {
		members: {
			speciality: { level: SkillLevel };
			user: { profile: { timeForWork: number[] } | null };
		}[];
		_count: { vacancies: number };
	} | null;
	workflow?: {
		currentStep: { order: number } | null;
		steps: { name: string; order: number; done: boolean }[];
	} | null;
}) => ({
	team: (project.team?.members ?? []).map((member) => ({
		level: member.speciality.level,
		hoursPerWeek: member.user.profile?.timeForWork ?? null,
	})),
	openPositions: project.team?._count.vacancies ?? 0,
	steps: project.workflow?.steps ?? [],
	currentStepOrder: project.workflow?.currentStep?.order ?? null,
});

/**
 * Stages a scout has no deal to do with, named as the `default` workflow seeds
 * them: a project sitting on `Introduction` has been registered and no more,
 * and `Support` / `Project Completion` are past the point where money goes in.
 *
 * Matched on the name because nothing in the schema marks a stage this way —
 * the same limitation the investment estimate works around, and the same place
 * a `phase` flag on the workflow step would fix both.
 */
const HIDDEN_STAGES = ["Introduction", "Support", "Project Completion"];

/**
 * Applied only when the scout has not named stages themselves. Written as a
 * negation so it keeps projects with no workflow at all: those have not said
 * where they are, which is not the same as saying they are somewhere dull.
 */
export const DEFAULT_STAGE_FILTER = {
	NOT: {
		workflow: {
			is: {
				currentStep: {
					is: {
						name: { in: HIDDEN_STAGES, mode: "insensitive" as const },
					},
				},
			},
		},
	},
};

/**
 * A project whose author anonymised their account. `personalDataDeletedAt` is
 * what the GDPR deletion stamps; the row survives with placeholder names, and a
 * scout has nobody to talk to about it.
 *
 * A negation again, so a project with no author on it at all still shows.
 */
export const ABANDONED_FILTER = {
	NOT: { author: { is: { personalDataDeletedAt: { not: null } } } },
};

export type ScoutFacets = {
	genres: string[];
	platforms: string[];
	stages: string[];
};

/**
 * The values worth filtering by — taken from the projects themselves, since
 * genre and platform are free text and stage names live in the workflow schema.
 *
 * Its own resource because it does not vary with the caller's filters or page:
 * the games list used to recompute it on every keystroke, and the Investment
 * Focus form used to run the entire games pipeline to read it.
 */
export async function getScoutFacets(): Promise<ScoutFacets> {
	const [genres, platforms, stages] = await Promise.all([
		prisma.project.findMany({
			where: { status: { in: VISIBLE_STATUSES }, genre: { not: null } },
			distinct: ["genre"],
			select: { genre: true },
		}),
		prisma.project.findMany({
			where: { status: { in: VISIBLE_STATUSES }, platform: { not: null } },
			distinct: ["platform"],
			select: { platform: true },
		}),
		prisma.projectWorkflowStep.findMany({
			where: { currentInWorkflow: { isNot: null } },
			distinct: ["name"],
			select: { name: true },
		}),
	]);

	return {
		genres: genres.map((row) => row.genre).filter((name) => name !== null),
		platforms: platforms
			.map((row) => row.platform)
			.filter((name) => name !== null),
		stages: stages.map((row) => row.name),
	};
}
