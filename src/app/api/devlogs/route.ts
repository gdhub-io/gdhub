import { z } from "zod";
import { apiError, json, withValidation } from "@/lib/api-handlers";
import { getDevlogFeedPage } from "@/repositories/devlog/feed";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const DevlogsQuerySchema = z.object({
	projectId: z.string().optional(),
	after: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

type DevlogsQuery = z.infer<typeof DevlogsQuerySchema>;

export const GET = withValidation(
	DevlogsQuerySchema,
	"query",
)(async (_req, _ctx, { body }) => {
	const { projectId, after, limit } = body as DevlogsQuery;

	try {
		return json(await getDevlogFeedPage({ projectId, after, limit }));
	} catch (error) {
		console.error("Error fetching project reports:", error);
		return apiError.internal();
	}
});
