import { isE2EAuth } from "@/auth";
import { apiError, json } from "@/lib/api-handlers";
import { listFixtureUsers } from "@/repositories/dev-fixture-users.repository";

export const dynamic = "force-dynamic";

/**
 * The accounts the header's "Switch account" menu offers, behind the same
 * `isE2EAuth` gate as the credentials provider that signs them in — without it
 * there is nothing to switch with, so the menu must not appear either.
 */
export async function GET() {
	if (!isE2EAuth) return apiError.notFound();

	return json(await listFixtureUsers());
}
