import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({ mode: "user" })(async (req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const requestedById = currentUser.id;

	try {
		const url = new URL(req.url);
		const action = url.searchParams.get("action") ?? undefined;
		const userId = url.searchParams.get("userId") ?? requestedById;
		const params = { userId, requestedById };

		if (action === "prepare-delete") {
			const preview = await prisma.user.prepareToDeletePersonalData(params);
			return json(preview);
		}

		if (action === "export") {
			const exportData = await prisma.user.exportPersonalData(params);
			return json(exportData);
		}

		return apiError.badRequest("Unsupported user privacy action");
	} catch (error) {
		console.error("[user/privacy] error", error);
		return apiError.internal(
			error instanceof Error ? error.message : "Unknown error",
		);
	}
});

export const POST = withAuth({ mode: "user" })(async (req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const requestedById = currentUser.id;

	try {
		const body = (await req.json().catch(() => ({}))) as {
			action?: string;
			userId?: string;
			reason?: string;
		};
		const { action, userId = requestedById, reason } = body;

		if (action === "delete-personal-data") {
			const result = await prisma.user.deletePersonalData({
				userId,
				requestedById,
				reason,
			});
			return json(result);
		}

		return apiError.badRequest("Unsupported user privacy action");
	} catch (error) {
		console.error("[user/privacy] error", error);
		return apiError.internal(
			error instanceof Error ? error.message : "Unknown error",
		);
	}
});
