import type {
	PaymentRateType,
	Prisma,
	SkillLevel,
} from "@gdhub-io/gdhub-prisma";
import { EXPERT_SKILL_LEVELS, weeklyHours } from "@/helpers/speciality";
import { prisma } from "@/services/prisma";
import {
	feedVisibleProjectFilter,
	getPublishedStoreProjects,
} from "@/services/prisma/queries";

const STRIP_SIZE = 4;
const LIVE_LINE_DAYS = 7;
const LIVE_LINE_AVATARS = 5;

export type LandingProject = {
	id: string;
	slug: string;
	name: string;
	genre: string | null;
	coverImage: string | null;
	authorName: string | null;
};

export type LandingVacancy = {
	id: string;
	title: string;
	directionName: string;
	projectName: string | null;
	finishedAt: string | null;
	promisePercentage: number | null;
	offeredAmount: number | null;
	offeredRateType: PaymentRateType | null;
};

export type LandingTalent = {
	id: string;
	directionName: string;
	specialityName: string;
	level: SkillLevel | null;
	/** The middle of the range they gave, rounded; null when they gave none. */
	weeklyHours: number | null;
};

export type LandingExpert = {
	specialityId: string;
	name: string;
	image: string | null;
	specialityName: string;
	level: SkillLevel;
	summary: string | null;
};

export type LandingStoreProject = Awaited<
	ReturnType<typeof getPublishedStoreProjects>
>[number];

export type LandingData = {
	liveLine: { count: number; avatars: string[] };
	projects: LandingProject[];
	vacancies: LandingVacancy[];
	talents: LandingTalent[];
	storeProjects: LandingStoreProject[];
	experts: LandingExpert[];
};

export const EMPTY_LANDING_DATA: LandingData = {
	liveLine: { count: 0, avatars: [] },
	projects: [],
	vacancies: [],
	talents: [],
	storeProjects: [],
	experts: [],
};

const openToCollaborate = (since: Date) => ({
	onboardingDone: true,
	profile: { is: { isActive: true, updatedAt: { gte: since } } },
});

async function liveLine() {
	const since = new Date(Date.now() - LIVE_LINE_DAYS * 24 * 60 * 60 * 1000);
	const [count, faces] = await Promise.all([
		prisma.user.count({ where: openToCollaborate(since) }),
		prisma.user.findMany({
			where: { ...openToCollaborate(since), image: { not: null } },
			select: { image: true },
			orderBy: { profile: { updatedAt: "desc" } },
			take: LIVE_LINE_AVATARS,
		}),
	]);

	return {
		count,
		avatars: faces.flatMap((face) => (face.image ? [face.image] : [])),
	};
}

async function latestProjects(): Promise<LandingProject[]> {
	const projects = await prisma.project.findMany({
		where: { status: "Approved", ...feedVisibleProjectFilter },
		orderBy: { createdAt: "desc" },
		take: STRIP_SIZE,
		select: {
			id: true,
			slug: true,
			name: true,
			genre: true,
			coverImage: true,
			author: { select: { name: true } },
		},
	});

	return projects.map(({ author, ...project }) => ({
		...project,
		authorName: author?.name ?? null,
	}));
}

async function openVacancies(): Promise<LandingVacancy[]> {
	const vacancies = await prisma.teamVacancy.findMany({
		where: { status: "Published", finishedAt: { gt: new Date() } },
		orderBy: { publishedAt: "desc" },
		take: STRIP_SIZE,
		select: {
			id: true,
			title: true,
			finishedAt: true,
			promisePercentage: true,
			offeredAmount: true,
			offeredRateType: true,
			direction: { select: { name: true } },
			team: { select: { project: { select: { name: true } } } },
		},
	});

	return vacancies.map(({ direction, team, finishedAt, ...vacancy }) => ({
		...vacancy,
		directionName: direction.name,
		projectName: team.project?.name ?? null,
		finishedAt: finishedAt?.toISOString() ?? null,
	}));
}

/** The fallback for the talents strip when no team is hiring. */
async function newTalents(): Promise<LandingTalent[]> {
	const users = await prisma.user.findMany({
		where: {
			onboardingDone: true,
			profile: { is: { isActive: true } },
			specialities: { some: {} },
		},
		orderBy: { createdAt: "desc" },
		take: STRIP_SIZE,
		select: {
			id: true,
			profile: { select: { timeForWork: true } },
			specialities: {
				select: {
					name: true,
					level: true,
					direction: { select: { name: true } },
				},
				take: 1,
			},
		},
	});

	return users.map((user) => {
		const hours = weeklyHours(user.profile?.timeForWork);
		const speciality = user.specialities[0];

		return {
			id: user.id,
			directionName: speciality?.direction.name ?? "",
			specialityName: speciality?.name ?? "",
			level: speciality?.level ?? null,
			weeklyHours: hours ? Math.round(hours) : null,
		};
	});
}

/** A speciality that can stand in "Top experts": an expert level, open to mentoring, with questions it takes. */
export const landingExpertWhere = {
	level: { in: EXPERT_SKILL_LEVELS },
	isOpenForMentoring: true,
	openForQuestions: { isEmpty: false },
} satisfies Prisma.SpecialityWhereInput;

/** `landingExpertWhere` for a speciality already read, kept beside it so the two cannot drift. */
export const isLandingExpert = (speciality: {
	level: SkillLevel | null;
	isOpenForMentoring: boolean;
	openForQuestions: unknown[];
}) =>
	!!speciality.level &&
	EXPERT_SKILL_LEVELS.includes(speciality.level) &&
	speciality.isOpenForMentoring &&
	speciality.openForQuestions.length > 0;

/**
 * The experts an admin featured; while none is, the most viewed. One card per
 * person, and only people with a photo — the strip is a wall of faces.
 */
async function topExperts(): Promise<LandingExpert[]> {
	const where = { ...landingExpertWhere, user: { image: { not: null } } };
	const featured = await prisma.speciality.count({
		where: { ...where, isFeatured: true },
	});
	const specialities = await prisma.speciality.findMany({
		where: featured ? { ...where, isFeatured: true } : where,
		orderBy: { viewsCount: "desc" },
		distinct: ["userId"],
		take: STRIP_SIZE,
		select: {
			id: true,
			name: true,
			level: true,
			summary: true,
			user: { select: { name: true, image: true } },
		},
	});

	return specialities.map(({ id, user, name, level, summary }) => ({
		specialityId: id,
		name: user.name ?? "",
		image: user.image,
		specialityName: name,
		level,
		summary,
	}));
}

/**
 * Everything the landing's strips show. Each part fails on its own: a landing
 * hides an empty strip and never surfaces a fetch error.
 */
export async function getLandingData(): Promise<LandingData> {
	const settle = <T>(promise: Promise<T>, fallback: T) =>
		promise.catch((error) => {
			console.error(error);
			return fallback;
		});

	const [line, projects, vacancies, talents, storeProjects, experts] =
		await Promise.all([
			settle(liveLine(), EMPTY_LANDING_DATA.liveLine),
			settle(latestProjects(), []),
			settle(openVacancies(), []),
			settle(newTalents(), []),
			settle(
				getPublishedStoreProjects({ limit: STRIP_SIZE, platform: "steam" }),
				[],
			),
			settle(topExperts(), []),
		]);

	return {
		liveLine: line,
		projects,
		vacancies,
		talents,
		storeProjects,
		experts,
	};
}
