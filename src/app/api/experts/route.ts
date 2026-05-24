import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";
import { json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const ExpertsQuerySchema = z.object({
	workDirectionId: z.string().optional(),
	lang: z
		.enum(Object.values(prismaClient.Language) as [string, ...string[]])
		.optional(),
});

type ExpertsQuery = z.infer<typeof ExpertsQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		ExpertsQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const { workDirectionId, lang } = body as ExpertsQuery;

		const experts = await prisma.user.findMany({
			where: {
				lang: lang as prismaClient.Language | undefined,
				specialities: {
					some: {
						level: {
							in: [
								prismaClient.SkillLevel.Experienced,
								prismaClient.SkillLevel.Expert,
							],
						},
						openForQuestions: { isEmpty: false },
						...(workDirectionId ? { workDirectionId } : {}),
					},
				},
			},
			select: {
				id: true,
				name: true,
				image: true,
				profile: {
					select: {
						tgNickname: true,
					},
				},
				specialities: {
					where: {
						level: {
							in: [
								prismaClient.SkillLevel.Experienced,
								prismaClient.SkillLevel.Expert,
							],
						},
						openForQuestions: { isEmpty: false },
						...(workDirectionId ? { workDirectionId } : {}),
					},
					include: {
						direction: true,
					},
				},
			},
		});

		return json(experts);
	}),
);
