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

const EventFlagsSchema = z.object({
	isFeatured: z.boolean(),
});

/**
 * Editorial flags — what the catalogue leads with.
 *
 * Featuring is a hub decision, not the organiser's: it is the platform putting
 * one event at the top of a page everybody sees. So it lives here rather than
 * in event settings, and needs `admin.events.manage`.
 */
export const PATCH = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.events.manage" }),
	withValidation(EventFlagsSchema),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const { isFeatured } = body as z.infer<typeof EventFlagsSchema>;

	const event = await prisma.event.update({
		where: { id },
		data: { isFeatured },
		select: { id: true, isFeatured: true },
	});

	return json(event);
});

/**
 * Moderation delete: staff run the catalogue but hold no role inside an event
 * space (§3.1), so this cannot go through the organiser's own endpoint — it is
 * guarded by `admin.events.manage` instead.
 */
export const DELETE = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.events.manage" }),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };

	// Schedule and members go with the event through the FK cascade; the space
	// memberships that grant access to it are polymorphic and have no foreign
	// key, so nothing removes them but this call. One transaction, as in the
	// organiser's own delete.
	await prisma.$transaction(async (tx) => {
		await deleteSpaceMembership("event", id, tx);
		await tx.event.delete({ where: { id } });
	});

	return json({ success: true });
});
