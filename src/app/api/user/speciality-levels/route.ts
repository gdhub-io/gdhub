import { SkillLevel } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const enumArray = <T extends [string, ...string[]]>(values: T) =>
	z.preprocess(
		(v) => (v == null ? undefined : Array.isArray(v) ? v : [v]),
		z.array(z.enum(values)).optional(),
	);

const SpecialityLevelsQuerySchema = z.object({
	level: enumArray(Object.values(SkillLevel) as [string, ...string[]]),
});

type SpecialityLevelsQuery = z.infer<typeof SpecialityLevelsQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		SpecialityLevelsQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { level } = body as SpecialityLevelsQuery;

		const specialities = await prisma.speciality.findMany({
			where: {
				userId: currentUser.id,
				level: level ? { in: level as SkillLevel[] } : undefined,
			},
			select: { level: true },
		});

		const levels = specialities.map(
			(speciality: { level: SkillLevel }) => speciality.level,
		);
		const uniqueLevels = [...new Set(levels)];

		return json(uniqueLevels);
	}),
);
