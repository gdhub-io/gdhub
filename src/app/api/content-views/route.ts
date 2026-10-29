import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { recordContentViews } from "@/repositories/content/views";
import {
	type ContentViewsInput,
	ContentViewsSchema,
} from "@/schemas/content-views";
import { resolveViewerKey } from "@/services/viewer-identity";

/**
 * Records that one viewer saw a batch of content.
 *
 * Open to anonymous visitors: a public devlog page has no session, and the point
 * of the counter is everyone who looked, not everyone who signed in. Signing in
 * only sharpens deduplication — see `resolveViewerKey`.
 *
 * Always answers 200. The counter is best-effort telemetry that rides along with
 * reading a feed; a failure here must not surface as a broken page.
 */
export const POST = pipe(
	withAuth({ mode: "any" }),
	withValidation(ContentViewsSchema, "body"),
)(async (req, _ctx, { user, body }) => {
	const { subject, ids, source } = body as ContentViewsInput;

	const viewer = await resolveViewerKey(req, user?.id);
	// No salt means no way to tell repeat viewers apart, and counting them all
	// would be worse than counting none.
	if (!viewer) return json({ recorded: 0 });

	try {
		const recorded = await recordContentViews({
			subjectType: subject,
			// The client dedupes within a flush, but nothing guarantees it.
			ids: [...new Set(ids)],
			viewerKey: viewer.viewerKey,
			viewedOn: viewer.viewedOn,
			source,
		});

		return json({ recorded });
	} catch (error) {
		console.error("Error recording content views:", error);
		return json({ recorded: 0 });
	}
});
