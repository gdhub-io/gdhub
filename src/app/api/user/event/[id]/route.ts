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

const UserEventUpdateSchema = z.object({
	title: z.string().optional(),
	slug: z.string().optional(),
	lang: z
		.enum(Object.values(prismaClient.$Enums.Language) as [string, ...string[]])
		.optional(),
	description: z.string().optional(),
	shortDescription: z.string().optional(),
	url: z.string().optional(),
	image: z.string().optional(),
	isFree: z.boolean().optional(),
	content: z.record(z.any()).optional(),
	certificationEnabled: z.boolean().optional(),
});

type UserEventUpdateBody = z.infer<typeof UserEventUpdateSchema>;

export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const isAdmin = currentUser.roles?.includes(prismaClient.UserRole.Admin);

	const event = await prisma.event.findUnique({
		where: {
			id,
			createdById: isAdmin ? undefined : currentUser.id,
		},
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

export const PUT = withAuth({ mode: "user" })(
	withValidation(UserEventUpdateSchema)(async (_req, ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const { id } = (await ctx.params) as { id: string };
		const data = body as UserEventUpdateBody;

		const event = await prisma.event.update({
			where: {
				id,
			},
			data: data as prismaClient.Prisma.EventUpdateInput,
			include: {
				schedule: true,
			},
		});

		return json(event);
	}),
);

export const DELETE = withAuth({ mode: "user" })(
	async (_req, ctx, { user }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const { id } = (await ctx.params) as { id: string };

		await prisma.event.delete({
			where: {
				id,
			},
		});

		return json({ success: true });
	},
);
