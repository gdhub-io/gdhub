import { randomUUID } from "node:crypto";
import slugify from "slugify";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { prisma } from "@/services/prisma";

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "event.info.edit", idFrom: "params.id" }),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };

	const event = await prisma.event.findUnique({
		where: { id },
		select: { title: true },
	});

	if (!event) {
		return apiError.notFound("Event not found");
	}

	const updatedEvent = await prisma.event.update({
		where: { id },
		data: {
			slug:
				slugify(event.title, { lower: true, strict: true }) +
				"-" +
				randomUUID().slice(-6),
		},
	});

	return json({ slug: updatedEvent.slug });
});
