import { Language, Prisma } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { deleteSpaceMembership } from "@/services/access/membership";
import { prisma } from "@/services/prisma";

/**
 * The settings form submits every field it holds, and an empty one arrives as
 * `null` — removing a cover posts `image: null` outright. `.optional()` accepts
 * only `undefined`, so the whole save came back 400 and nothing was written;
 * the nullable columns take `.nullish()` and clear properly.
 */
const UserEventUpdateSchema = z.object({
	title: z.string().optional(),
	slug: z.string().nullish(),
	lang: z.enum(Object.values(Language) as [string, ...string[]]).optional(),
	description: z.string().optional(),
	shortDescription: z.string().nullish(),
	url: z.string().nullish(),
	image: z.string().nullish(),
	isFree: z.boolean().optional(),
	content: z.record(z.any()).nullish(),
	certificationEnabled: z.boolean().optional(),
});

type UserEventUpdateBody = z.infer<typeof UserEventUpdateSchema>;

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "event.info.view", idFrom: "params.id" }),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };

	// No `createdById` filter: the guard already decided who may look at this
	// event, and narrowing the query again would hide it from the team.
	const event = await prisma.event.findUnique({
		where: { id },
		include: {
			schedule: {
				orderBy: [
					{
						startDate: "asc",
					},
				],
				include: {
					speakers: {
						select: {
							id: true,
							name: true,
							user: {
								select: {
									image: true,
									profile: {
										select: {
											name: true,
										},
									},
								},
							},
						},
					},
				},
			},
		},
	});

	return json(event);
});

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "event.info.edit", idFrom: "params.id" }),
	withValidation(UserEventUpdateSchema),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const { content, ...data } = body as UserEventUpdateBody;

	const event = await prisma.event.update({
		where: { id },
		data: {
			...(data as Prisma.EventUpdateInput),
			// A Json column is cleared with `DbNull`; a bare `null` throws.
			...(content === undefined ? null : { content: content ?? Prisma.DbNull }),
		},
		include: { schedule: true },
	});

	return json(event);
});

export const DELETE = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "event.lifecycle.delete", idFrom: "params.id" }),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };

	// One transaction, because these two clean up the same thing from different
	// sides. `EventMember` rows go with the event through the FK cascade, but
	// `SpaceMember` — which is what actually grants access to the event space —
	// is polymorphic and has no foreign key, so nothing removes it but this call.
	// Run apart, a failure between them left memberships pointing at an event
	// that no longer exists.
	await prisma.$transaction(async (tx) => {
		await deleteSpaceMembership("event", id, tx);
		await tx.event.delete({ where: { id } });
	});

	return json({ success: true });
});
