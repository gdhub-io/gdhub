import { Language } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { EXPERT_SKILL_LEVELS } from "@/helpers/speciality";
import { json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const ExpertsQuerySchema = z.object({
	workDirectionId: z.string().optional(),
	lang: z.enum(Object.values(Language) as [string, ...string[]]).optional(),
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
				lang: lang as Language | undefined,
				specialities: {
					some: {
						level: { in: EXPERT_SKILL_LEVELS },
						// `isOpenForMentoring` is the switch in the profile; a speciality
						// with no questions has nothing to show on a card, and the
						// migration flagged specialities that never had any.
						isOpenForMentoring: true,
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
						level: { in: EXPERT_SKILL_LEVELS },
						// `isOpenForMentoring` is the switch in the profile; a speciality
						// with no questions has nothing to show on a card, and the
						// migration flagged specialities that never had any.
						isOpenForMentoring: true,
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
