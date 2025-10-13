import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import dayjs from "dayjs";
import {
	BadRequestException,
	Body,
	createHandler,
	Delete,
	Get,
	Post,
	Put,
	Query,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import { slugify } from "voca";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class CreateProjectDto {
	@IsString()
	name: string;

	@IsBoolean()
	agree: boolean;

	@IsString()
	@IsOptional()
	description?: string;
}

class UpdateProjectDto {
	@IsString()
	@IsOptional()
	name?: string;

	@IsString({ each: true })
	@IsOptional()
	coreMechanics?: string[];

	@IsString()
	@IsOptional()
	description?: string;

	@IsString()
	@IsOptional()
	coverImage?: string;

	@IsString()
	@IsOptional()
	genre?: string;

	@IsString()
	@IsOptional()
	setting?: string;

	@IsString()
	@IsOptional()
	platform?: string;

	@IsString()
	@IsOptional()
	visualStyle?: string;

	@IsString()
	@IsOptional()
	audition?: string;

	@IsString()
	@IsOptional()
	videoLink?: string;

	@IsString()
	@IsOptional()
	pitchdeckLink?: string;

	@IsString()
	@IsOptional()
	gddLink?: string;

	@IsString()
	@IsOptional()
	conceptLink?: string;

	@IsString()
	@IsOptional()
	authorId?: string;

	@IsEnum(prismaClient.ProjectStatus)
	@IsOptional()
	status?: prismaClient.ProjectStatus;

	@IsString()
	@IsOptional()
	stageId?: string;
}

class GetProjectDto {
	@IsString()
	slug: string;
}

class QueryIdParam {
	@IsString()
	id: string;
}

@NextAuthGuard("user")
class ApiProjectHandler {
	@Get()
	public async get(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { slug }: GetProjectDto,
	) {
		const project = await prisma.project.findUnique({
			where: {
				slug,
				OR: [
					{ authorId: req.user.id },
					{ team: { members: { some: { userId: req.user.id } } } },
				],
			},
			include: { workflow: { include: { steps: true } } },
		});

		return project;
	}

	@Post()
	public async create(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) { name, description, agree }: CreateProjectDto,
	) {
		if (!req.user.id) throw Error("Unknown user");
		if (!agree) throw Error("Should accept requirements");

		const user = await prisma.user.findUnique({
			where: { id: req.user.id },
			include: {
				specialities: true,
				memberInTeams: {
					where: { status: prismaClient.TeamMemberStatus.Founder },
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

		if (!user) throw Error("User not found");

		const existingProjectTeam = user?.memberInTeams.find(
			(member: {
				status: prismaClient.TeamMemberStatus;
				team: { project: { slug: string } | null };
			}) =>
				member.status == prismaClient.TeamMemberStatus.Founder &&
				member.team.project?.slug == slugify(name),
		);

		const existingProject = await prisma.project.findUnique({
			where: { slug: slugify(name) },
		});

		if (existingProject) {
			throw new BadRequestException("Project with this name already exists");
		}

		const project = await prisma.project.create({
			data: {
				name,
				agree,
				slug: slugify(name),
				description,
				author: { connect: { id: req.user.id } },
				status: prismaClient.ProjectStatus.Approved,
				team: existingProjectTeam
					? { connect: { id: existingProjectTeam.teamId } }
					: {
							create: {
								name: `${slugify(name)}'s Team`,
								members: {
									create: {
										position: "Founder",
										specialityId: user?.specialities[0].id!,
										startedAt: dayjs().toISOString(),
										status: prismaClient.TeamMemberStatus.Founder,
										userId: req.user.id,
									},
								},
							},
						},
				reports: {
					create: {
						content: "Registration of the project on the service",
						publishedAt: dayjs().toISOString(),
						authorId: req.user.id,
					},
				},
			},
			include: {
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

		if (!project.author.roles.includes(prismaClient.UserRole.Author)) {
			await prisma.user.update({
				where: { id: req.user.id },
				data: {
					roles: [...project.author.roles, prismaClient.UserRole.Author],
				},
			});
		}

		return project;
	}

	@Put()
	public async update(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { id }: QueryIdParam,
		@Body(ValidationPipe) { authorId, ...data }: UpdateProjectDto,
	) {
		const project = await prisma.project.update({
			where: { id },
			data: {
				...data,
				author: authorId ? { connect: { id: authorId } } : undefined,
			},
			include: {
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

		if (!project.author.roles.includes(prismaClient.UserRole.Author)) {
			await prisma.user.update({
				where: { id: req.user.id },
				data: {
					roles: [...project.author.roles, prismaClient.UserRole.Author],
				},
			});
		}

		return project;
	}

	@Delete()
	public async delete(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { id }: QueryIdParam,
	) {
		await prisma.project.delete({ where: { id, authorId: req.user.id } });
	}
}

export default createHandler(ApiProjectHandler);
