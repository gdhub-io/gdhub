import {
	AdviceRequestStatus,
	EventType,
	SkillLevel,
	UserRole,
} from "@gdhub-io/gdhub-prisma";
import { SpaceRole } from "@/config/permissions/roles";
import { joinSpace } from "@/services/access/membership";
import { prisma } from "@/services/prisma";

/**
 * The kinds of person a screen has to be checked as.
 *
 * One declarative catalogue with two ways in: `test-env` seeds all of them so a
 * screen can be opened by hand, and a test calls `becomePersona` on a user it
 * owns. A test that mutates a shared fixture is a test that fails in the wrong
 * order, so automated runs should grant rather than borrow.
 *
 * Note what is *not* here: educator and organiser are not platform roles.
 * `hub.courses.create` and `hub.events.create` belong to every member, so those
 * two are simply people who own a course or an event.
 */
export type PersonaKey =
	| "unonboarded"
	| "member"
	| "author"
	| "advisor"
	| "hubAdmin"
	| "superAdmin"
	| "scout"
	| "educator"
	| "organiser";

export type Persona = {
	key: PersonaKey;
	email: string;
	name: string;
	/** One line saying what this account is for. */
	what: string;
	apply: (userId: string) => Promise<void>;
};

const direction = async () => {
	const row = await prisma.workDirection.findFirst();

	if (!row) {
		throw new Error(
			"No WorkDirection rows. Seed the reference data first: gdhub-prisma seed",
		);
	}

	return row;
};

const ensureSpeciality = async (userId: string, openForMentoring = false) => {
	const existing = await prisma.speciality.findFirst({ where: { userId } });

	if (existing) {
		return prisma.speciality.update({
			where: { id: existing.id },
			data: { isOpenForMentoring: openForMentoring },
		});
	}

	const { id: workDirectionId } = await direction();

	return prisma.speciality.create({
		data: {
			name: "Software Engineer",
			specialization: "Backend",
			level: SkillLevel.Experienced,
			isOpenForMentoring: openForMentoring,
			openForQuestions: openForMentoring
				? ["How do I structure a backend for a live-service game?"]
				: [],
			userId,
			workDirectionId,
		},
	});
};

const slugFor = (key: PersonaKey, kind: string) => `${kind}-of-${key}`;

const ensureProject = async (userId: string, key: PersonaKey) =>
	prisma.project.upsert({
		where: { slug: slugFor(key, "project") },
		update: { authorId: userId },
		create: {
			name: "Hollow Tide",
			slug: slugFor(key, "project"),
			authorId: userId,
		},
	});

const ensureCourse = async (userId: string, key: PersonaKey) => {
	const { id: directionId } = await direction();

	return prisma.course.upsert({
		where: { slug: slugFor(key, "course") },
		update: { createdById: userId },
		create: {
			name: "Shipping your first vertical slice",
			slug: slugFor(key, "course"),
			createdById: userId,
			directionId,
		},
	});
};

/** Events are keyed by title here: `slug` is optional and nullable on the model. */
const ensureEvent = async (userId: string, key: PersonaKey) => {
	const title = `Pitch night (${key})`;
	const existing = await prisma.event.findFirst({ where: { title } });

	if (existing) return existing;

	return prisma.event.create({
		data: {
			title,
			description: "A fixture event, for checking the organiser's side.",
			type: EventType.Meetup,
			createdById: userId,
		},
	});
};

/** An inbox with something in it: the advisor screen is unreadable when empty. */
const ensureAdviceRequests = async (advisorId: string) => {
	const asker = await prisma.user.findFirst({
		where: { id: { not: advisorId }, email: { not: null } },
		select: { id: true },
	});

	if (!asker) return;

	const project = await prisma.project.findFirst({ select: { id: true } });

	const questions: [AdviceRequestStatus, string, string][] = [
		[
			AdviceRequestStatus.Created,
			"How do we price a premium DLC for a 12k-wishlist game?",
			"We are 3 months from launch and the publisher pushes for a season pass instead of one paid DLC.",
		],
		[
			AdviceRequestStatus.Approved,
			"Store page conversion drops after the trailer",
			"Capsule, trailer and the first screenshot are all first-pass. The store page is attached: https://store.steampowered.com/",
		],
		[
			AdviceRequestStatus.Executed,
			"Onboarding retention drops on day 2",
			"Tutorial is 8 minutes, D1 is fine, D2 falls to 19%.",
		],
	];

	for (const [status, topic, comment] of questions) {
		const existing = await prisma.adviceRequest.findFirst({
			where: { toUserId: advisorId, topic },
			select: { id: true },
		});

		if (existing) continue;

		await prisma.adviceRequest.create({
			data: {
				toUserId: advisorId,
				fromUserId: asker.id,
				projectId: project?.id,
				topic,
				comment,
				status,
			},
		});
	}
};

export const PERSONAS: Persona[] = [
	{
		key: "unonboarded",
		email: "unonboarded@gdhub.local",
		name: "Nina Halfway",
		what: "Registered and stopped in the middle of onboarding.",
		apply: async (userId) => {
			await prisma.user.update({
				where: { id: userId },
				data: { onboardingDone: false, roles: { set: [UserRole.Guest] } },
			});
			await joinSpace({ type: "hub", userId, role: SpaceRole.Guest });
		},
	},
	{
		key: "member",
		email: "member@gdhub.local",
		name: "Oleg Onboarded",
		what: "Finished onboarding and nothing else.",
		apply: async (userId) => {
			await ensureSpeciality(userId);
			await joinSpace({ type: "hub", userId, role: SpaceRole.Member });
		},
	},
	{
		key: "author",
		email: "author@gdhub.local",
		name: "Anna Volkova",
		what: "Owns a project.",
		apply: async (userId) => {
			await prisma.user.update({
				where: { id: userId },
				data: { roles: { set: [UserRole.Member, UserRole.Author] } },
			});
			await ensureSpeciality(userId);
			await joinSpace({ type: "hub", userId, role: SpaceRole.Member });
			const project = await ensureProject(userId, "author");
			await joinSpace({
				type: "project",
				spaceId: project.id,
				userId,
				role: SpaceRole.Owner,
			});
		},
	},
	{
		key: "advisor",
		email: "advisor@gdhub.local",
		name: "Marat Iskhakov",
		what: "Mentorship on, so the advisor space resolves.",
		apply: async (userId) => {
			await ensureSpeciality(userId, true);
			await joinSpace({ type: "hub", userId, role: SpaceRole.Member });
			await ensureAdviceRequests(userId);
		},
	},
	{
		key: "hubAdmin",
		email: "hub-admin@gdhub.local",
		name: "Sofia Green",
		what: "Platform staff: admin in the hub, and so in every other space.",
		apply: async (userId) => {
			await ensureSpeciality(userId);
			await joinSpace({ type: "hub", userId, role: SpaceRole.Admin });
		},
	},
	{
		key: "superAdmin",
		email: "superadmin@gdhub.local",
		name: "Ilya Petrov",
		what: "Hub admin plus the break-glass bypass.",
		apply: async (userId) => {
			await prisma.user.update({
				where: { id: userId },
				data: { isSuperAdmin: true, roles: { set: [UserRole.Admin] } },
			});
			await joinSpace({ type: "hub", userId, role: SpaceRole.Admin });
		},
	},
	{
		key: "scout",
		email: "scout@gdhub.local",
		name: "Vera Kalina",
		what: "Has a cabinet, so the scout space resolves.",
		apply: async (userId) => {
			const { createScout } = await import("@/repositories/scout");
			await createScout(userId, { organizationName: "Northlight Capital" });
			await joinSpace({ type: "hub", userId, role: SpaceRole.Member });
		},
	},
	{
		key: "educator",
		email: "educator@gdhub.local",
		name: "Pavel Rykov",
		what: "Owns a course. Not a platform role — every member may create one.",
		apply: async (userId) => {
			await ensureSpeciality(userId);
			await joinSpace({ type: "hub", userId, role: SpaceRole.Member });
			const course = await ensureCourse(userId, "educator");
			await joinSpace({
				type: "course",
				spaceId: course.id,
				userId,
				role: SpaceRole.Owner,
			});
		},
	},
	{
		key: "organiser",
		email: "organiser@gdhub.local",
		name: "Dana Orlova",
		what: "Owns an event. Also not a platform role.",
		apply: async (userId) => {
			await ensureSpeciality(userId);
			await joinSpace({ type: "hub", userId, role: SpaceRole.Member });
			const event = await ensureEvent(userId, "organiser");
			await joinSpace({
				type: "event",
				spaceId: event.id,
				userId,
				role: SpaceRole.Owner,
			});
		},
	},
];

export const PERSONA_BY_KEY = new Map(PERSONAS.map((p) => [p.key, p]));

/** Grants an existing user everything a persona is, without moving their identity. */
export async function becomePersona(userId: string, key: PersonaKey) {
	const persona = PERSONA_BY_KEY.get(key);
	if (!persona) throw new Error(`Unknown persona "${key}"`);

	await persona.apply(userId);
}

/** Upserts the persona's own account and applies it. Idempotent. */
export async function ensurePersona(persona: Persona) {
	const user = await prisma.user.upsert({
		where: { email: persona.email },
		// `Member` before `apply` runs: parts of the app still read the legacy
		// role, and the default leaves a persona looking like a guest.
		update: { onboardingDone: true, roles: { set: [UserRole.Member] } },
		create: {
			email: persona.email,
			name: persona.name,
			emailVerified: new Date(),
			onboardingDone: true,
			roles: [UserRole.Member],
			// A stub, so the JWT callback skips ensureMatrixUser and no Matrix
			// server is needed to sign in.
			matrixUserId: `@${persona.key}:matrix.local`,
			profile: { create: { name: persona.name } },
		},
	});

	await persona.apply(user.id);

	return user;
}

export async function ensureAllPersonas() {
	for (const persona of PERSONAS) await ensurePersona(persona);
}
