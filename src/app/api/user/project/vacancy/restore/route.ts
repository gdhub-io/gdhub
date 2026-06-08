import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";

import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const LISTING_WINDOW_DAYS = 90;
const DEFAULT_FINISH_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// Restoring an archived vacancy does NOT revive the old paid listing — a paid
// listing is bought for a single window. Instead we duplicate the data into a
// fresh Draft (no payment, new window anchor); the archived one stays Closed and
// the user pays again to publish.
export const POST = withAuth({ mode: "user" })(async (req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const url = new URL(req.url);
	const id = url.searchParams.get("id");
	if (!id) return apiError.badRequest("id is required");

	const source = await prisma.teamVacancy.findFirst({
		where: { id },
		select: {
			title: true,
			description: true,
			directionId: true,
			teamId: true,
			finishedAt: true,
			promisePercentage: true,
			promiseStepId: true,
			offeredAmount: true,
			offeredRateType: true,
			team: { select: { project: { select: { authorId: true } } } },
		},
	});

	if (!source) return apiError.notFound("Vacancy not found");
	if (source.team?.project?.authorId !== currentUser.id) {
		return apiError.forbidden(
			"You do not have permission to access this vacancy",
		);
	}

	// New window is anchored to now. Keep the original finish date if it's still
	// valid within the window, otherwise default to a sensible future date.
	const now = Date.now();
	const maxFinish = now + LISTING_WINDOW_DAYS * DAY_MS;
	const sourceFinish = source.finishedAt.getTime();
	const finishedAt =
		sourceFinish > now && sourceFinish <= maxFinish
			? source.finishedAt
			: new Date(now + DEFAULT_FINISH_DAYS * DAY_MS);

	const created = await prisma.teamVacancy.create({
		data: {
			title: source.title,
			description: source.description,
			directionId: source.directionId,
			teamId: source.teamId,
			finishedAt,
			status: prismaClient.TeamVacancyStatus.Draft,
			promisePercentage: source.promisePercentage,
			promiseStepId: source.promiseStepId,
			// Copy the offered compensation (already in cents); the new listing is
			// paid for again, so no Payment row is created here.
			offeredAmount: source.offeredAmount,
			offeredRateType: source.offeredRateType,
		},
	});

	return json(created);
});
