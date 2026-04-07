import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import {
	IsBoolean,
	IsEnum,
	IsNumber,
	IsOptional,
	IsString,
	Min,
} from "class-validator";
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
import {
	DEFAULT_DAMAGE_COMPENSATION_AMOUNT,
	DEFAULT_DAMAGE_COMPENSATION_CURRENCY,
	DEFAULT_INVESTMENT_RESERVE,
	DEFAULT_MENTOR_FUND_SHARE,
	MIN_MENTOR_FUND_SHARE,
	PLATFORM_SHARE_PERCENT,
} from "@/config/legal";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class CreateProjectDto {
	@IsString()
	name: string;

	@IsBoolean()
	acceptRequirements: boolean;

	@IsBoolean()
	@IsOptional()
	useCoDevelopmentAgreement?: boolean;

	@IsBoolean()
	@IsOptional()
	authorAgreementAccepted?: boolean;

	@IsString()
	@IsOptional()
	description?: string;

	@IsNumber()
	@Min(MIN_MENTOR_FUND_SHARE)
	@IsOptional()
	mentorFundShare?: number;

	@IsNumber()
	@Min(0)
	@IsOptional()
	investmentReserve?: number;

	@IsBoolean()
	@IsOptional()
	damageCompensationEnabled?: boolean;

	@IsNumber()
	@Min(1)
	@IsOptional()
	damageCompensationAmount?: number;
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
		@Body(ValidationPipe)
		{
			name,
			description,
			acceptRequirements,
			useCoDevelopmentAgreement,
			authorAgreementAccepted,
			mentorFundShare,
			investmentReserve,
			damageCompensationEnabled,
			damageCompensationAmount,
		}: CreateProjectDto,
	) {
		if (!req.user.id) throw Error("Unknown user");
		if (!acceptRequirements) throw Error("Should accept project requirements");

		if (useCoDevelopmentAgreement && !authorAgreementAccepted) {
			throw new BadRequestException(
				"The author should accept the co-development agreement",
			);
		}

		const initialMentorFundShare = mentorFundShare ?? DEFAULT_MENTOR_FUND_SHARE;
		const initialInvestmentReserve =
			investmentReserve ?? DEFAULT_INVESTMENT_RESERVE;
		const initialDamageCompensationEnabled = Boolean(damageCompensationEnabled);
		const initialDamageCompensationAmount =
			damageCompensationAmount ?? DEFAULT_DAMAGE_COMPENSATION_AMOUNT;

		if (
			useCoDevelopmentAgreement &&
			initialMentorFundShare + initialInvestmentReserve >
				100 - PLATFORM_SHARE_PERCENT
		) {
			throw new BadRequestException(
				"Mentor fund and investment reserve exceed available project share",
			);
		}

		if (
			useCoDevelopmentAgreement &&
			initialDamageCompensationEnabled &&
			initialDamageCompensationAmount <= 0
		) {
			throw new BadRequestException(
				"Damage compensation amount should be greater than 0",
			);
		}

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
		if (!user.specialities.length) {
			throw new BadRequestException(
				"User should have at least one speciality before creating a project",
			);
		}

		const existingProjectTeam = user?.memberInTeams.find(
			(member: {
				status: prismaClient.TeamMemberStatus;
				team: { project: { slug: string } | null };
			}) =>
				member.status === prismaClient.TeamMemberStatus.Founder &&
				member.team.project?.slug === slugify(name),
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
				agree: Boolean(acceptRequirements),
				platformRequirementsAccepted: Boolean(acceptRequirements),
				usesCoDevelopmentAgreement: Boolean(useCoDevelopmentAgreement),
				damageCompensationEnabled: Boolean(
					useCoDevelopmentAgreement && initialDamageCompensationEnabled,
				),
				damageCompensationAmount:
					useCoDevelopmentAgreement && initialDamageCompensationEnabled
						? initialDamageCompensationAmount
						: null,
				damageCompensationCurrency:
					useCoDevelopmentAgreement && initialDamageCompensationEnabled
						? DEFAULT_DAMAGE_COMPENSATION_CURRENCY
						: null,
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
										specialityId: user.specialities[0].id,
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

		if (useCoDevelopmentAgreement) {
			await prisma.projectEquity.upsert({
				where: { projectId: project.id },
				update: {
					platformShare: PLATFORM_SHARE_PERCENT,
					mentorFundShare: initialMentorFundShare,
					investmentReserve: initialInvestmentReserve,
				},
				create: {
					projectId: project.id,
					platformShare: PLATFORM_SHARE_PERCENT,
					mentorFundShare: initialMentorFundShare,
					investmentReserve: initialInvestmentReserve,
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
