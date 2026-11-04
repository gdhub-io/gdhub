import { apiError, json } from "@/lib/api-handlers";
import { loadPublicDevlogPost } from "@/repositories/devlog/post";

type Params = Promise<{ projectReportId: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
	try {
		const { projectReportId } = await params;

		if (!projectReportId) {
			return apiError.badRequest("Project report ID is required");
		}

		const post = await loadPublicDevlogPost(projectReportId);
		if (!post) return apiError.notFound("Project report not found");

		return json(post);
	} catch (error) {
		console.error("Error fetching project report:", error);
		return apiError.internal();
	}
}
