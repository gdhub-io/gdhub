import { prisma } from "@/services/prisma";
import { TalentGraph, type TalentSpeciality } from "./TalentGraph";

export const dynamic = "force-dynamic";

/** Mean of the `[min, max]` hours/week range the profile stores; 0 when unset. */
function weeklyHours(timeForWork: number[] | undefined): number {
	if (!timeForWork?.length) return 0;
	return timeForWork.reduce((sum, h) => sum + h, 0) / timeForWork.length;
}

export default async function DevTalentGraphPage() {
	const rows = await prisma.speciality.findMany({
		where: { user: { personalDataDeletedAt: null } },
		select: {
			id: true,
			name: true,
			level: true,
			userId: true,
			direction: { select: { name: true } },
			user: {
				select: { profile: { select: { country: true, timeForWork: true } } },
			},
		},
	});

	const specialities: TalentSpeciality[] = rows.map((s) => ({
		id: s.id,
		userId: s.userId,
		name: s.name,
		direction: s.direction.name,
		level: s.level,
		country: s.user.profile?.country?.trim() || null,
		hours: weeklyHours(s.user.profile?.timeForWork),
		hoursRange: s.user.profile?.timeForWork ?? [],
	}));

	return <TalentGraph specialities={specialities} />;
}
