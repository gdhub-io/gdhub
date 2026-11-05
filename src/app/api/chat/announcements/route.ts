import type { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { AnnouncementPostSchema } from "@/schemas/chat-announcements";
import {
	canPostAnnouncements,
	postAnnouncement,
} from "@/services/chat/announcements";

type AnnouncementBody = z.infer<typeof AnnouncementPostSchema>;

// Written by an admin, posted by the GDHub account.
export const POST = pipe(
	withAuth({ mode: "user" }),
	withValidation(AnnouncementPostSchema),
)(async (_req, _ctx, { user, body }) => {
	if (!(await canPostAnnouncements(user as SessionUser))) {
		return apiError.forbidden();
	}

	await postAnnouncement(body as AnnouncementBody);
	return json({ ok: true });
});
