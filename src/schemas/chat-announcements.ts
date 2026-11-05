import { z } from "zod";
import { CHAT_IMAGE_MAX_BYTES, CHAT_TEXT_MAX_LENGTH } from "@/config/chat";
import { parseMxc } from "@/helpers/chat-media";
import { env } from "@/helpers/env";

// Only media already on our homeserver: a post must not point readers elsewhere.
const isOwnMxc = (url: string) =>
	parseMxc(url)?.serverName === env("MATRIX_CHAT_HOMESERVER_DOMAIN");

export const AnnouncementTextSchema = z
	.string()
	.trim()
	.min(1)
	.max(CHAT_TEXT_MAX_LENGTH);

export const AnnouncementImageSchema = z.object({
	url: z.string().refine(isOwnMxc, "Unknown media"),
	name: z.string().min(1).max(255),
	mimetype: z.string().regex(/^image\//),
	size: z.number().int().positive().max(CHAT_IMAGE_MAX_BYTES),
	w: z.number().int().positive(),
	h: z.number().int().positive(),
});

export const AnnouncementPostSchema = z
	.object({
		text: AnnouncementTextSchema.optional(),
		image: AnnouncementImageSchema.optional(),
	})
	.refine((post) => !!post.text || !!post.image, "Empty post");

/** A text post's new text, or a picture post's picture and caption (may be empty). */
export const AnnouncementEditSchema = z
	.object({
		text: z.string().trim().max(CHAT_TEXT_MAX_LENGTH).optional(),
		image: AnnouncementImageSchema.optional(),
	})
	.refine((edit) => !!edit.image || !!edit.text, "Empty edit");

export const MatrixEventIdSchema = z
	.string()
	.regex(/^\$[A-Za-z0-9_\-+/=:.]+$/, "Not an event id");
