import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfApplication } from "@/lib/space-ids";
import { seenByTheProject } from "@/lib/vacancy/seen";
import { getCandidateCard } from "@/repositories/vacancy/candidate-card";
import { prisma } from "@/services/prisma";

const CandidateQuerySchema = z.object({
	id: z.string(),
});

type CandidateQuery = z.infer<typeof CandidateQuerySchema>;

/** One application, as the project reviewing it reads it. */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.vacancies.review",
		idFrom: projectOfApplication,
	}),
	withValidation(CandidateQuerySchema, "query"),
)(async (_req, _ctx, { body, access }) => {
	const { id } = body as CandidateQuery;

	const card = await getCandidateCard(id);
	if (!card) return apiError.notFound("Application not found");

	if (access && seenByTheProject(access)) {
		await prisma.vacancyApplication.updateMany({
			where: { id, viewedAt: null },
			data: { viewedAt: new Date() },
		});
	}

	return json(card);
});
