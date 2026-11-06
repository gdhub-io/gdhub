import { z } from "zod";

/**
 * Synapse's notification emails show avatars and posted images, but a mail
 * client cannot authenticate against Matrix media. The email templates point
 * at /api/chat/media instead, and this decides what that route may fetch:
 * thumbnails only, only of our own homeserver's media, never the original.
 * The media id is random and long, the same capability unauthenticated Matrix
 * media relied on.
 */
const EMAIL_MEDIA_MAX = { width: 800, height: 600 } as const;

const QuerySchema = z.object({
	width: z.coerce.number().int().min(1).max(EMAIL_MEDIA_MAX.width),
	height: z.coerce.number().int().min(1).max(EMAIL_MEDIA_MAX.height),
	method: z.enum(["crop", "scale"]),
});

const MEDIA_ID = /^[A-Za-z0-9_-]{8,255}$/;

/** The thumbnail path to ask the homeserver for, or null when the request is refused. */
export function emailMediaThumbnailPath(
	server: string,
	mediaId: string,
	query: URLSearchParams,
	homeserverDomain: string,
): string | null {
	if (server !== homeserverDomain || !MEDIA_ID.test(mediaId)) return null;

	const parsed = QuerySchema.safeParse(Object.fromEntries(query));
	if (!parsed.success) return null;

	const { width, height, method } = parsed.data;
	const params = new URLSearchParams({
		width: String(width),
		height: String(height),
		method,
		animated: "false",
	});
	return `/_matrix/client/v1/media/thumbnail/${encodeURIComponent(server)}/${mediaId}?${params}`;
}
