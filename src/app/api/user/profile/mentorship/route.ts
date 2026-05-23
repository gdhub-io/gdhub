import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const MentorshipSchema = z.union([
	z.object({
		enabled: z.boolean(),
	}),
	z.object({
		specialityId: z.string(),
		openForQuestions: z.array(z.string()),
		timeForMentoring: z.string().optional(),
	}),
]);

type MentorshipBody = z.infer<typeof MentorshipSchema>;

function isSwitchMentorshipType(
	data: MentorshipBody,
): data is { enabled: boolean } {
	return (data as { enabled?: boolean }).enabled !== undefined;
}

export const PUT = withAuth({ mode: "user" })(
	withValidation(MentorshipSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const data = body as MentorshipBody;

		if (isSwitchMentorshipType(data)) {
			const { enabled } = data;

			const roles = currentUser.roles as prismaClient.UserRole[];
			const hasMentorshipRole = roles.includes(prismaClient.UserRole.Mentor);

			if (enabled && !hasMentorshipRole) {
				roles.push(prismaClient.UserRole.Mentor);
			}

			if (!enabled && hasMentorshipRole) {
				const idx = roles.findIndex((v) => v === prismaClient.UserRole.Mentor);

				if (idx !== -1) {
					roles.splice(idx, 1);
				}
			}

			await prisma.user.update({
				where: { id: currentUser.id },
				data: { roles: { set: roles } },
			});

			return json({ enabled });
		}

		const { specialityId, timeForMentoring, openForQuestions } = data;

		await prisma.speciality.update({
			where: { id: specialityId },
			data: {
				timeForMentoring: timeForMentoring === "" ? null : timeForMentoring,
				openForQuestions: { set: openForQuestions },
			},
		});

		return json({ success: true });
	}),
);
