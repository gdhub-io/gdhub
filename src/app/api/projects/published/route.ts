import { apiError, json, withAuth } from "@/lib/api-handlers";
import { getPublishedStoreProjects } from "@/services/prisma/queries";

export const GET = withAuth({ mode: "user" })(async () => {
	try {
		return json(await getPublishedStoreProjects({ limit: 4 }));
	} catch (error) {
		console.error("[projects: published: list: error]", error);
		return apiError.badRequest("Failed to get published projects");
	}
});
