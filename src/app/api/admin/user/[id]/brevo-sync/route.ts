import { apiError, json, pipe, withAuth } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { syncUserToBrevo } from "@/services/brevo/sync";

/**
 * Pushes one user's marketing attributes into Brevo.
 *
 * Same gate as the bulk route — one contact or all of them, it is still a write
 * to an outside system.
 */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.users.manage" }),
)(async (req, ctx) => {
	const { id } = (await ctx.params) as { id?: string };

	if (!id) return apiError.badRequest("Missing user id");

	// `?dryRun=1` builds the payload and skips the write — see `isDryRunByDefault`.
	const dryRunParam = new URL(req.url).searchParams.get("dryRun");
	const dryRun = dryRunParam === null ? undefined : dryRunParam === "1";

	try {
		return json(await syncUserToBrevo(id, { dryRun }));
	} catch (error) {
		if (error instanceof Error && error.message === "User not found") {
			return apiError.notFound();
		}

		if (error instanceof Error && error.message === "User has no email") {
			return apiError.badRequest("User has no email to sync");
		}

		console.error("[brevo: sync-user]", error);
		return apiError.internal("Failed to sync the user with Brevo");
	}
});
