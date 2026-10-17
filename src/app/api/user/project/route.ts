import { randomUUID } from "node:crypto";
import {
	type Prisma,
	ProjectStatus,
	TeamMemberStatus,
} from "@gdhub-io/gdhub-prisma";
import dayjs from "dayjs";
import { z } from "zod";
import { PROJECT_REGISTERED_DEVLOG_CONTENT } from "@/config/devlog";
import { SpaceRole } from "@/config/permissions/roles";
import { nextFreeSlug, toSlug } from "@/helpers/slug";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import {
	LegalAcceptancesSchema,
	LegalError,
	resolveLegal,
} from "@/lib/legal/accept";
import { legalErrorResponse, requestMeta } from "@/lib/legal/http";
import { limitAiCalls } from "@/lib/rate-limit";
import { withSpaceGuard } from "@/lib/space-guard";
import {
	DEFAULT_PROJECT_STAGE,
	placeProjectOnStage,
	selectableStageNames,
} from "@/repositories/project-workflow";
import { userSpacesCacheKey } from "@/repositories/user-spaces";
import { deleteSpaceMembership, joinSpace } from "@/services/access/membership";
import { aiValidation } from "@/services/ai-validation";
import { cacheDelete } from "@/services/cache";
import { closeVacancyChats } from "@/services/chat/vacancy-keys";
import { prisma } from "@/services/prisma";
import {
	getProjectLifecycleNotificationSnapshot,
	notifyProjectLifecycleRecipients,
} from "@/services/projectLifecycleNotifications";
import { matchKey } from "@/services/workflow/matchKey";

const GetProjectQuerySchema = z.object({
	slug: z.string(),
});

const CreateProjectSchema = z.object({
	name: z.string(),
	legal: LegalAcceptancesSchema,
	// Creation-time gate only: the author confirms they are making the game
	// themselves and that this form is not an AI prompt. Never persisted.
	understandsNotAi: z.boolean(),
	description: z.string().optional(),
	genre: z.string().trim().min(1).optional(),
	/** A stage name of the default template; Ideation when omitted. */
	stage: z.string().trim().min(1).optional(),
});

const UpdateProjectSchema = z.object({
	name: z.string().optional(),
	coreMechanics: z.array(z.string()).optional(),
	description: z.string().nullable().optional(),
	coverImage: z.string().nullable().optional(),
	genre: z.string().nullable().optional(),
	setting: z.string().nullable().optional(),
	platform: z.string().nullable().optional(),
	visualStyle: z.string().nullable().optional(),
	audition: z.string().nullable().optional(),
	videoLink: z.string().nullable().optional(),
	pitchdeckLink: z.string().nullable().optional(),
	gddLink: z.string().nullable().optional(),
	conceptLink: z.string().nullable().optional(),
	authorId: z.string().optional(),
	status: z
		.enum(Object.values(ProjectStatus) as [string, ...string[]])
		.optional(),
	stageId: z.string().optional(),
});

type GetProjectQuery = z.infer<typeof GetProjectQuerySchema>;
type CreateProjectBody = z.infer<typeof CreateProjectSchema>;
type UpdateProjectBody = z.infer<typeof UpdateProjectSchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		GetProjectQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { slug } = body as GetProjectQuery;

		const project = await prisma.project.findUnique({
			where: {
				slug,
				OR: [
					{ authorId: currentUser.id },
					{ team: { members: { some: { userId: currentUser.id } } } },
				],
			},
			include: {
				team: { select: { id: true } },
				workflow: { include: { steps: true } },
			},
		});

		return json(project);
	}),
);

export const POST = withAuth({ mode: "user" })(
	withValidation(CreateProjectSchema)(async (req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const {
			name,
			description,
			genre,
			stage = DEFAULT_PROJECT_STAGE,
			legal,
			understandsNotAi,
		} = body as CreateProjectBody;

		let acceptances: Prisma.LegalAcceptanceCreateManyInput[];
		try {
			acceptances = resolveLegal(legal, ["ProjectRequirements"], {
				userId: currentUser.id,
				context: "ProjectCreate",
				meta: requestMeta(req),
			});
		} catch (error) {
			if (error instanceof LegalError) return legalErrorResponse(error);
			throw error;
		}
		if (!understandsNotAi)
			return apiError.badRequest(
				"Should confirm the game is made by the author, not generated",
			);

		const stages = await selectableStageNames();
		if (!stages.some((name) => matchKey(name) === matchKey(stage))) {
			return apiError.badRequest("Unknown stage", { stages });
		}

		const userRecord = await prisma.user.findUnique({
			where: { id: currentUser.id },
			select: { specialities: { select: { id: true }, take: 1 } },
		});

		if (!userRecord) return apiError.notFound("User not found");
		// The founder's team row needs one.
		const specialityId = userRecord.specialities[0]?.id;
		if (!specialityId) return apiError.badRequest("Add your speciality first");

		const limited = await limitAiCalls("project-create", currentUser.id);
		if (limited) return limited;

		// AI checks: no offensive/forbidden content, name looks like a real
		// project title, and the description (if any) is on-topic.
		const validation = await aiValidation.validate(
			[
				{ key: "name", label: "Title", value: name, kind: "project_name" },
				{
					key: "description",
					label: "Description",
					value: description ?? "",
					kind: "project_description",
				},
			],
			{ locale: currentUser.lang },
		);
		if (!validation.ok) {
			return json(
				{ error: "Validation failed", statusCode: 400, validation },
				{ status: 400 },
			);
		}

		// Two teams may well be making a game called "Dungeon Crawler". The name
		// is theirs to pick; only the slug has to be unique, so the second one
		// becomes `dungeon-crawler-2` instead of a rejected request.
		const baseSlug = toSlug(name, "project");
		const takenSlugs = await prisma.project.findMany({
			where: { slug: { startsWith: baseSlug } },
			select: { slug: true },
		});
		const slug = nextFreeSlug(
			baseSlug,
			takenSlugs.map((project: { slug: string }) => project.slug),
		);

		// `Team.name` is unique too, so it is derived from the slug rather than
		// from the raw name.
		const createProjectWithSlug = (projectSlug: string) =>
			prisma.project.create({
				data: {
					name,
					agree: true,
					slug: projectSlug,
					description,
					genre,
					author: { connect: { id: currentUser.id } },
					status: ProjectStatus.Approved,
					team: {
						create: {
							name: `${projectSlug}'s Team`,
							members: {
								create: {
									position: "Founder",
									specialityId,
									startedAt: dayjs().toISOString(),
									status: TeamMemberStatus.Founder,
									userId: currentUser.id,
								},
							},
						},
					},
					reports: {
						create: {
							content: PROJECT_REGISTERED_DEVLOG_CONTENT,
							isSystem: true,
							publishedAt: dayjs().toISOString(),
							authorId: currentUser.id,
						},
					},
				},
				include: {
					team: { select: { id: true } },
					author: {
						select: {
							name: true,
							image: true,
							id: true,
							profile: { select: { id: true } },
						},
					},
				},
			});

		let project: Awaited<ReturnType<typeof createProjectWithSlug>>;
		try {
			project = await createProjectWithSlug(slug);
		} catch (error) {
			// The counter is read and used in two steps, so two simultaneous
			// creations of the same name can pick the same slug — the loser of
			// that race gets a random suffix instead of an error.
			if ((error as { code?: string }).code !== "P2002") throw error;
			project = await createProjectWithSlug(
				`${baseSlug}-${randomUUID().slice(-6)}`,
			);
		}

		// Not in the creation's transaction: the project extension that copies the
		// template writes `currentStepId` through its own client, outside any `tx`,
		// so the workflow has to be committed before it can be moved.
		const currentStep = await prisma.$transaction((tx) =>
			placeProjectOnStage(tx, project.id, stage),
		);

		await prisma.legalAcceptance.createMany({
			data: acceptances.map((row) => ({ ...row, projectId: project.id })),
		});

		// Membership is what the space gates read; a project without its owner row
		// would be unreachable for its own author.
		await joinSpace({
			type: "project",
			spaceId: project.id,
			userId: currentUser.id,
			role: SpaceRole.Owner,
		});

		// The switcher lists this now, and a cache that says otherwise for the
		// next minute reads as the space not having been created.
		await cacheDelete(userSpacesCacheKey(currentUser.id));

		// `UserRole.Author` used to be stamped on the user here. Owning a project
		// is the `SpaceMember(project, Owner)` row written just above — a fact,
		// not a label that has to be kept in sync.
		return json({ ...project, stage: currentStep.name, validation });
	}),
);

export const PUT = pipe(
	withAuth({ mode: "user" }),
	// Until this guard existed, any signed-in user could update any project by
	// id — including its status and, through `authorId`, its owner.
	withSpaceGuard({ permission: "project.info.edit", idFrom: "query.id" }),
	withValidation(UpdateProjectSchema),
)(async (req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const url = new URL(req.url);
	const id = url.searchParams.get("id");
	if (!id) return apiError.badRequest("id is required");

	const { authorId, ...data } = body as UpdateProjectBody;

	const project = await prisma.project.update({
		where: { id },
		data: {
			...data,
			status: data.status as ProjectStatus | undefined,
			author: authorId ? { connect: { id: authorId } } : undefined,
		},
		include: {
			team: { select: { id: true } },
			author: {
				select: {
					name: true,
					image: true,
					id: true,
					profile: { select: { id: true } },
				},
			},
		},
	});

	return json(project);
});

export const DELETE = withAuth({ mode: "user" })(
	async (req, _ctx, { user }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const url = new URL(req.url);
		const id = url.searchParams.get("id");
		if (!id) return apiError.badRequest("id is required");

		const notificationSnapshot = await getProjectLifecycleNotificationSnapshot({
			db: prisma,
			projectId: id,
			authorId: currentUser.id,
		});
		// Collect BEFORE deletion — the cascade removes the vacancy rows.
		const projectVacancies = await prisma.teamVacancy.findMany({
			where: { team: { project: { id } } },
			select: { id: true },
		});

		const project = await prisma.project.deleteProject({
			projectId: id,
			authorId: currentUser.id,
		});

		// No foreign key cascades here: the link from a space to its entity is
		// polymorphic, so the membership rows have to go explicitly.
		await deleteSpaceMembership("project", id);

		// Deleting the project takes its vacancies away — end their chats too.
		try {
			await Promise.all(
				projectVacancies.map((vacancy) => closeVacancyChats(vacancy.id)),
			);
		} catch (e) {
			console.error("[vacancy-chat] close on project delete failed", e);
		}

		await notifyProjectLifecycleRecipients({
			action: "delete",
			snapshot: notificationSnapshot,
		});

		return json(project);
	},
);
