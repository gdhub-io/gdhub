import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const IdQuerySchema = z.object({
	id: z.string(),
});

const CreateVacancySchema = z.object({
	title: z.string(),
	description: z.string(),
	directionId: z.string(),
	status: z.enum(
		Object.values(prismaClient.TeamVacancyStatus) as [string, ...string[]],
	),
	publishedAt: z.string().nullable().optional(),
	finishedAt: z.string(),
	teamId: z.string(),
	promisePercentage: z.number().nullable().optional(),
	promiseStepId: z.string().nullable().optional(),
	paymentAmount: z.number().nullable().optional(),
	paymentRateType: z
		.enum(["Hourly", "OneTime", "Monthly"])
		.nullable()
		.optional(),
});

const UpdateVacancySchema = z.object({
	title: z.string().optional(),
	description: z.string().optional(),
	directionId: z.string().optional(),
	status: z
		.enum(
			Object.values(prismaClient.TeamVacancyStatus) as [string, ...string[]],
		)
		.optional(),
	publishedAt: z.string().nullable().optional(),
	finishedAt: z.string().optional(),
	promisePercentage: z.number().nullable().optional(),
	promiseStepId: z.string().nullable().optional(),
	paymentAmount: z.number().nullable().optional(),
	paymentRateType: z
		.enum(["Hourly", "OneTime", "Monthly"])
		.nullable()
		.optional(),
});

type IdQuery = z.infer<typeof IdQuerySchema>;
type CreateVacancyBody = z.infer<typeof CreateVacancySchema>;
type UpdateVacancyBody = z.infer<typeof UpdateVacancySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		IdQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { id } = body as IdQuery;

		const data = await prisma.teamVacancy.findFirst({
			where: { id },
			include: {
				promiseStep: true,
				team: {
					select: {
						id: true,
						project: {
							select: {
								id: true,
								name: true,
								slug: true,
								description: true,
								coverImage: true,
								videoLink: true,
								workflow: {
									select: {
										currentStepId: true,
										steps: {
											select: { id: true, name: true },
										},
									},
								},
							},
						},
					},
				},
				_count: { select: { applicants: true } },
			},
		});

		const teamMember = await prisma.teamMember.findFirst({
			where: { vacancyId: id, userId: currentUser.id },
		});

		return json({ ...data, myTeamMemberId: teamMember?.id });
	}),
);

export const POST = withAuth({ mode: "user" })(
	withValidation(CreateVacancySchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const data = body as CreateVacancyBody;
		try {
			const {
				promisePercentage,
				promiseStepId,
				paymentAmount,
				paymentRateType,
				...vacancyData
			} = data;
			const hasEquityPromise = promisePercentage && promiseStepId;

			const vacancy = await prisma.teamVacancy.create({
				data: {
					...vacancyData,
					status: vacancyData.status as prismaClient.TeamVacancyStatus,
					promisePercentage: hasEquityPromise ? promisePercentage : undefined,
					promiseStepId: hasEquityPromise ? promiseStepId : undefined,
				},
			});

			return json({
				...vacancy,
				pendingPaymentData:
					paymentAmount && paymentRateType
						? { paymentAmount, paymentRateType }
						: null,
			});
		} catch (error) {
			console.error("[project.create]", error);
			throw error;
		}
	}),
);

export const PUT = withAuth({ mode: "user" })(
	withValidation(UpdateVacancySchema)(async (req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const url = new URL(req.url);
		const id = url.searchParams.get("id");
		if (!id) return apiError.badRequest("id is required");
		const data = body as UpdateVacancyBody;
		const {
			promisePercentage,
			promiseStepId,
			paymentAmount,
			paymentRateType,
			...vacancyData
		} = data;

		const vacancy = await prisma.teamVacancy.update({
			where: { id },
			data: {
				...vacancyData,
				status: vacancyData.status as
					| prismaClient.TeamVacancyStatus
					| undefined,
				promisePercentage,
				promiseStepId,
			},
		});

		return json({
			...vacancy,
			pendingPaymentData:
				paymentAmount && paymentRateType
					? { paymentAmount, paymentRateType }
					: null,
		});
	}),
);

export const DELETE = withAuth({ mode: "user" })(
	async (req, _ctx, { user }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const url = new URL(req.url);
		const id = url.searchParams.get("id");
		if (!id) return apiError.badRequest("id is required");

		await prisma.teamVacancy.update({
			where: { id },
			data: { status: prismaClient.TeamVacancyStatus.Closed },
		});

		return json({ success: true });
	},
);
