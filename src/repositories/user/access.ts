import { prisma } from "@/services/prisma";

/** What the access resolver needs to know about each of these users. */
export const getAccessUsers = (ids: string[]) =>
	prisma.user.findMany({
		where: { id: { in: ids } },
		select: { id: true, roles: true, onboardingDone: true, isSuperAdmin: true },
	});
