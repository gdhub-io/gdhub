import { apiError, json } from "@/lib/api-handlers";
import { findPublishedCourse } from "@/repositories/course/public";

type Params = Promise<{ slug: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
	const { slug } = await params;

	const course = await findPublishedCourse(slug);
	if (!course) return apiError.notFound("Course not found");
	return json(course);
}
