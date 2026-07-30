import type { SkillLevel } from "@gdhub-io/gdhub-prisma";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({ mode: "user" })(async (req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const url = new URL(req.url);
	const levelValues = url.searchParams.getAll("level");
	const level = levelValues.length ? (levelValues as SkillLevel[]) : undefined;

	const specialities = await prisma.speciality.findMany({
		where: { userId: currentUser.id, level: level ? { in: level } : undefined },
		include: { direction: true },
		orderBy: { createdAt: "desc" },
	});

	return json(specialities);
});
