import type { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import {
	AnnouncementEditSchema,
	MatrixEventIdSchema,
} from "@/schemas/chat-announcements";
import {
	canPostAnnouncements,
	deleteAnnouncement,
	editAnnouncement,
} from "@/services/chat/announcements";

async function eventIdOf(ctx: { params: Promise<unknown> }) {
	const { eventId } = (await ctx.params) as { eventId: string };
	const parsed = MatrixEventIdSchema.safeParse(decodeURIComponent(eventId));
	return parsed.success ? parsed.data : null;
}

// Whoever may post as GDHub may also correct or withdraw what GDHub posted.
export const PATCH = pipe(
	withAuth({ mode: "user" }),
	withValidation(AnnouncementEditSchema),
)(async (_req, ctx, { user, body }) => {
	if (!(await canPostAnnouncements(user as SessionUser))) {
		return apiError.forbidden();
	}
	const eventId = await eventIdOf(ctx);
	if (!eventId) return apiError.badRequest("Not an event id");

	await editAnnouncement(
		eventId,
		body as z.infer<typeof AnnouncementEditSchema>,
	);
	return json({ ok: true });
});

export const DELETE = withAuth({ mode: "user" })(
	async (_req, ctx, { user }) => {
		if (!(await canPostAnnouncements(user as SessionUser))) {
			return apiError.forbidden();
		}
		const eventId = await eventIdOf(ctx);
		if (!eventId) return apiError.badRequest("Not an event id");

		await deleteAnnouncement(eventId);
		return json({ ok: true });
	},
);
