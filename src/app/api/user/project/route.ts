import {
	ProjectStatus,
	TeamMemberStatus,
	UserRole,
} from "@gdhub-io/gdhub-prisma";
import dayjs from "dayjs";
import slugify from "voca/slugify";
import { z } from "zod";
import { PROJECT_REGISTERED_DEVLOG_CONTENT } from "@/config/devlog";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { aiValidation } from "@/services/ai-validation";
import { closeVacancyChats } from "@/services/chat/vacancy-keys";
import { prisma } from "@/services/prisma";
import {
	getProjectLifecycleNotificationSnapshot,
	notifyProjectLifecycleRecipients,
} from "@/services/projectLifecycleNotifications";

const GetProjectQuerySchema = z.object({
	slug: z.string(),
});

const CreateProjectSchema = z.object({
	name: z.string(),
	agree: z.boolean(),
	description: z.string().optional(),
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
	withValidation(CreateProjectSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { name, description, agree } = body as CreateProjectBody;

		if (!agree) return apiError.badRequest("Should accept requirements");

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

		const userRecord = await prisma.user.findUnique({
			where: { id: currentUser.id },
			include: {
				specialities: true,
				memberInTeams: {
					where: { status: TeamMemberStatus.Founder },
					include: {
						team: {
							include: {
								project: { select: { id: true, name: true, slug: true } },
							},
						},
					},
				},
			},
		});

		if (!userRecord) return apiError.notFound("User not found");

		const existingProjectTeam = userRecord.memberInTeams.find(
			(member: {
				status: TeamMemberStatus;
				team: { project: { slug: string } | null };
			}) =>
				member.status === TeamMemberStatus.Founder &&
				member.team.project?.slug === slugify(name),
		);

		const existingProject = await prisma.project.findUnique({
			where: { slug: slugify(name) },
		});

		if (existingProject) {
			return apiError.badRequest("Project with this name already exists");
		}

		const project = await prisma.project.create({
			data: {
				name,
				agree,
				slug: slugify(name),
				description,
				author: { connect: { id: currentUser.id } },
				status: ProjectStatus.Approved,
				team: existingProjectTeam
					? { connect: { id: existingProjectTeam.teamId } }
					: {
							create: {
								name: `${slugify(name)}'s Team`,
								members: {
									create: {
										position: "Founder",
										// biome-ignore lint/style/noNonNullAssertion: original semantics
										specialityId: userRecord.specialities[0]!.id,
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
						roles: true,
						profile: { select: { id: true } },
					},
				},
			},
		});

		if (!project.author.roles.includes(UserRole.Author)) {
			await prisma.user.update({
				where: { id: currentUser.id },
				data: {
					roles: [...project.author.roles, UserRole.Author],
				},
			});
		}

		return json({ ...project, validation });
	}),
);

export const PUT = withAuth({ mode: "user" })(
	withValidation(UpdateProjectSchema)(async (req, _ctx, { user, body }) => {
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
						roles: true,
						profile: { select: { id: true } },
					},
				},
			},
		});

		if (!project.author.roles.includes(UserRole.Author)) {
			await prisma.user.update({
				where: { id: currentUser.id },
				data: {
					roles: [...project.author.roles, UserRole.Author],
				},
			});
		}

		return json(project);
	}),
);

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
