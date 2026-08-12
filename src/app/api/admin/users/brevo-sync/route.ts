import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { previewBrevoSync, syncAllUsersToBrevo } from "@/services/brevo/sync";

/** `1` keeps only the users who finished onboarding. */
const flag = z
	.enum(["0", "1"])
	.optional()
	.transform((value) => (value === undefined ? undefined : value === "1"));

const PreviewQuerySchema = z.object({ onlyOnboarded: flag });

type PreviewQuery = z.infer<typeof PreviewQuerySchema>;

/**
 * What a full sync would do, without doing it — the confirm dialog asks for
 * this so an admin sees how many contacts are about to be created.
 */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.users.manage" }),
	withValidation(PreviewQuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	try {
		const { onlyOnboarded } = body as PreviewQuery;

		return json(await previewBrevoSync({ onlyOnboarded }));
	} catch (error) {
		console.error("[brevo: sync-preview]", error);
		return apiError.internal("Failed to read the Brevo contact list");
	}
});

/** `dryRun` builds the payload and skips the write — see `isDryRunByDefault`. */
const QuerySchema = z.object({ dryRun: flag, onlyOnboarded: flag });

type Query = z.infer<typeof QuerySchema>;

/**
 * Pushes every user's marketing attributes into Brevo.
 *
 * Gated on `admin.users.manage` rather than `.view`: it writes to a system
 * outside this app, and the write is not reversible from here.
 */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.users.manage" }),
	withValidation(QuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	try {
		const { dryRun, onlyOnboarded } = body as Query;

		return json(await syncAllUsersToBrevo({ dryRun, onlyOnboarded }));
	} catch (error) {
		console.error("[brevo: sync-all]", error);
		return apiError.internal("Failed to sync users with Brevo");
	}
});
