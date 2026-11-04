import isEqual from "lodash/isEqual";
import { prisma } from "@/services/prisma";

/**
 * The hours a week a person invests and whether they are open to other
 * authors' projects (GDHUB-141). The current value lives on the profile; every
 * change is also appended to `AvailabilityChange`, which is the history.
 *
 * The one write path for both fields: the header popover, profile settings and
 * onboarding all come through here, so none of them can skip the history.
 */
export type AvailabilityInput = {
	/** `[min, max]` hours a week; an empty array clears them. */
	timeForWork?: number[];
	isActive?: boolean;
};

const hoursOf = (timeForWork: number[]) =>
	timeForWork.length === 2
		? { minHours: timeForWork[0], maxHours: timeForWork[1] }
		: { minHours: null, maxHours: null };

export async function saveAvailability(
	userId: string,
	input: AvailabilityInput,
) {
	return prisma.$transaction(async (tx) => {
		const current = await tx.profile.findUniqueOrThrow({
			where: { userId },
			select: { timeForWork: true, isActive: true },
		});
		const next = {
			timeForWork: input.timeForWork ?? current.timeForWork,
			isActive: input.isActive ?? current.isActive,
		};
		if (isEqual(next, current)) return { ...next, changed: false };

		await tx.profile.update({ where: { userId }, data: next });
		await tx.availabilityChange.create({
			data: {
				userId,
				...hoursOf(next.timeForWork),
				openToProjects: next.isActive,
			},
		});
		return { ...next, changed: true };
	});
}

/** The current value and when it last changed, for the header. */
export async function getAvailability(userId: string) {
	const [profile, latest] = await Promise.all([
		prisma.profile.findUnique({
			where: { userId },
			select: { timeForWork: true, isActive: true },
		}),
		prisma.availabilityChange.findFirst({
			where: { userId },
			orderBy: { createdAt: "desc" },
			select: { createdAt: true },
		}),
	]);
	if (!profile) return null;
	return {
		timeForWork: profile.timeForWork,
		isActive: profile.isActive,
		changedAt: latest?.createdAt ?? null,
	};
}
