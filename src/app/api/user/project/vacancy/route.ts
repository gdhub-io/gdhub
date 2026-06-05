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

// A paid listing is valid for at most this many days from its publication.
// Anchoring the cap to the (set-once) publish date stops a single payment from
// being extended forever by repeatedly editing the finish date.
const LISTING_WINDOW_DAYS = 90;

function maxFinishedAt(anchor: Date): Date {
	const d = new Date(
		anchor.getTime() + LISTING_WINDOW_DAYS * 24 * 60 * 60 * 1000,
	);
	d.setHours(23, 59, 59, 999);
	return d;
}

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

		// Payment data lives in the Payment table, not on the vacancy. Surface the
		// latest one so the edit form can repopulate the amount/rate fields.
		const payment = await prisma.payment.findFirst({
			where: {
				payableType: prismaClient.PayableType.VACANCY,
				payableId: id,
			},
			orderBy: { createdAt: "desc" },
		});

		return json({
			...data,
			myTeamMemberId: teamMember?.id,
			payment,
			paymentAmount: payment?.amount ?? null,
			paymentRateType: payment?.rateType ?? null,
		});
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

			// New listing: the window is anchored to now.
			if (new Date(vacancyData.finishedAt) > maxFinishedAt(new Date())) {
				return apiError.badRequest(
					`finishedAt cannot be more than ${LISTING_WINDOW_DAYS} days from now`,
				);
			}

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
			// publishedAt from the client is ignored — it's set once, server-side.
			publishedAt: _clientPublishedAt,
			...vacancyData
		} = data;

		const existing = await prisma.teamVacancy.findUnique({
			where: { id },
			select: {
				publishedAt: true,
				createdAt: true,
				status: true,
				finishedAt: true,
			},
		});
		if (!existing) return apiError.notFound("Vacancy not found");

		// The window is anchored to the first publication (set-once). Falls back to
		// creation time while the vacancy has never been published. Only block an
		// actual extension past the window — keeping or shortening the date is always
		// allowed (so existing/legacy listings stay editable).
		if (vacancyData.finishedAt) {
			const anchor = existing.publishedAt ?? existing.createdAt;
			const nextFinishedAt = new Date(vacancyData.finishedAt);
			const isExtending = nextFinishedAt > existing.finishedAt;
			if (isExtending && nextFinishedAt > maxFinishedAt(anchor)) {
				return apiError.badRequest(
					`finishedAt cannot be more than ${LISTING_WINDOW_DAYS} days from publication`,
				);
			}
		}

		// Set publishedAt only on the first publish; never reset it afterwards, so
		// toggling draft/publish can't move the window anchor.
		const nextStatus = (vacancyData.status ??
			existing.status) as prismaClient.TeamVacancyStatus;
		const publishedAt =
			existing.publishedAt ??
			(nextStatus === prismaClient.TeamVacancyStatus.Published
				? new Date()
				: null);

		const vacancy = await prisma.teamVacancy.update({
			where: { id },
			data: {
				...vacancyData,
				status: vacancyData.status as
					| prismaClient.TeamVacancyStatus
					| undefined,
				publishedAt,
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

		// Drop any unsettled (non-COMPLETED) payment so an archived vacancy doesn't
		// carry a stale "pending" listing fee that would resurface on restore.
		// COMPLETED payments are kept as payment history.
		await prisma.payment.deleteMany({
			where: {
				payableType: prismaClient.PayableType.VACANCY,
				payableId: id,
				status: { not: prismaClient.PaymentStatus.COMPLETED },
			},
		});

		return json({ success: true });
	},
);
