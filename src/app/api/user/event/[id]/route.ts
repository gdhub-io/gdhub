import { Language, type Prisma } from "@gdhub-io/gdhub-prisma";
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

const UserEventUpdateSchema = z.object({
	title: z.string().optional(),
	slug: z.string().optional(),
	lang: z.enum(Object.values(Language) as [string, ...string[]]).optional(),
	description: z.string().optional(),
	shortDescription: z.string().optional(),
	url: z.string().optional(),
	image: z.string().optional(),
	isFree: z.boolean().optional(),
	content: z.record(z.any()).optional(),
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
	const data = body as UserEventUpdateBody;

	const event = await prisma.event.update({
		where: { id },
		data: data as Prisma.EventUpdateInput,
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

	await prisma.event.delete({ where: { id } });
	await deleteSpaceMembership("event", id);

	return json({ success: true });
});
