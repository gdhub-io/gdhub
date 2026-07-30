import {
	PayableType,
	type PaymentRateType,
	PaymentStatus,
	TeamVacancyStatus,
} from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { LISTING_WINDOW_DAYS } from "@/config/vacancy";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { closeVacancyChats } from "@/services/chat/vacancy-keys";
import { prisma } from "@/services/prisma";

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
	status: z.enum(Object.values(TeamVacancyStatus) as [string, ...string[]]),
	publishedAt: z.string().nullable().optional(),
	finishedAt: z.string(),
	teamId: z.string(),
	promisePercentage: z.number().nullable().optional(),
	promiseStepId: z.string().nullable().optional(),
	// Offered compensation (in major units, EUR) — stored on the vacancy in cents.
	offeredAmount: z.number().nullable().optional(),
	offeredRateType: z
		.enum(["Hourly", "OneTime", "Monthly"])
		.nullable()
		.optional(),
});

const UpdateVacancySchema = z.object({
	title: z.string().optional(),
	description: z.string().optional(),
	directionId: z.string().optional(),
	status: z
		.enum(Object.values(TeamVacancyStatus) as [string, ...string[]])
		.optional(),
	publishedAt: z.string().nullable().optional(),
	finishedAt: z.string().optional(),
	promisePercentage: z.number().nullable().optional(),
	promiseStepId: z.string().nullable().optional(),
	offeredAmount: z.number().nullable().optional(),
	offeredRateType: z
		.enum(["Hourly", "OneTime", "Monthly"])
		.nullable()
		.optional(),
});

// Offered compensation is entered/displayed in EUR but stored in minor units.
const toCents = (eur: number) => Math.round(eur * 100);
const fromCents = (cents: number | null | undefined) =>
	cents != null ? cents / 100 : null;

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

		// The Payment row is the listing fee (status/receipt). Surface the latest one
		// so the edit form knows whether the fee is paid.
		const payment = await prisma.payment.findFirst({
			where: {
				payableType: PayableType.VACANCY,
				payableId: id,
			},
			orderBy: { createdAt: "desc" },
		});

		return json({
			...data,
			// Offered compensation lives on the vacancy; expose it in EUR for the form.
			offeredAmount: fromCents(data?.offeredAmount),
			myTeamMemberId: teamMember?.id,
			payment,
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
				offeredAmount,
				offeredRateType,
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
					status: vacancyData.status as TeamVacancyStatus,
					promisePercentage: hasEquityPromise ? promisePercentage : undefined,
					promiseStepId: hasEquityPromise ? promiseStepId : undefined,
					offeredAmount: offeredAmount != null ? toCents(offeredAmount) : null,
					offeredRateType: (offeredRateType as PaymentRateType | null) ?? null,
				},
			});

			return json({
				...vacancy,
				offeredAmount: fromCents(vacancy.offeredAmount),
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
			offeredAmount,
			offeredRateType,
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
				team: { select: { project: { select: { authorId: true } } } },
			},
		});
		if (!existing) return apiError.notFound("Vacancy not found");
		if (existing.team?.project?.authorId !== currentUser.id) {
			return apiError.forbidden("Only the project author can edit a vacancy");
		}

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
			existing.status) as TeamVacancyStatus;
		const publishedAt =
			existing.publishedAt ??
			(nextStatus === TeamVacancyStatus.Published ? new Date() : null);

		const vacancy = await prisma.teamVacancy.update({
			where: { id },
			data: {
				...vacancyData,
				status: vacancyData.status as TeamVacancyStatus | undefined,
				publishedAt,
				promisePercentage,
				promiseStepId,
				// `undefined` = field not in the payload → leave unchanged (so e.g. a
				// table "Publish" that only sends status doesn't wipe the offer).
				offeredAmount:
					offeredAmount === undefined
						? undefined
						: offeredAmount === null
							? null
							: toCents(offeredAmount),
				offeredRateType:
					offeredRateType === undefined
						? undefined
						: ((offeredRateType as PaymentRateType | null) ?? null),
			},
		});

		// Archiving the listing ends its conversations too.
		if (vacancy.status === TeamVacancyStatus.Closed) {
			try {
				await closeVacancyChats(vacancy.id);
			} catch (e) {
				console.error("[vacancy-chat] close on vacancy close failed", e);
			}
		}

		return json({
			...vacancy,
			offeredAmount: fromCents(vacancy.offeredAmount),
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

		const target = await prisma.teamVacancy.findUnique({
			where: { id },
			select: {
				team: { select: { project: { select: { authorId: true } } } },
			},
		});
		if (!target) return apiError.notFound("Vacancy not found");
		if (target.team?.project?.authorId !== currentUser.id) {
			return apiError.forbidden(
				"Only the project author can archive a vacancy",
			);
		}

		await prisma.teamVacancy.update({
			where: { id },
			data: { status: TeamVacancyStatus.Closed },
		});

		// Archiving the listing ends its conversations too.
		try {
			await closeVacancyChats(id);
		} catch (e) {
			console.error("[vacancy-chat] close on vacancy delete failed", e);
		}

		// Drop any unsettled (non-COMPLETED) payment so an archived vacancy doesn't
		// carry a stale "pending" listing fee that would resurface on restore.
		// COMPLETED payments are kept as payment history.
		await prisma.payment.deleteMany({
			where: {
				payableType: PayableType.VACANCY,
				payableId: id,
				status: { not: PaymentStatus.COMPLETED },
			},
		});

		return json({ success: true });
	},
);
