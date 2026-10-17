import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { myDocuments } from "@/repositories/my-documents.repository";

export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	return json(await myDocuments(currentUser.id));
});
