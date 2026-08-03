import { UserRole } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

/**
 * Mentorship is saved in one request: the switch travels with the details it
 * needs. Turning it on without saying what you can help with is not an offer of
 * anything, so the switch alone was never a state worth storing.
 *
 * The flag still lives in `User.roles`. It moves to
 * `Speciality.isOpenForMentoring` once the package carries that column — that is
 * also what makes switching off remove the person from the experts showcase,
 * which today filters on `openForQuestions` instead.
 */
const MentorshipSchema = z.object({
	enabled: z.boolean(),
	specialityId: z.string().optional(),
	timeForMentoring: z.string().optional(),
	openForQuestions: z.array(z.string()).optional(),
});

type MentorshipBody = z.infer<typeof MentorshipSchema>;

/**
 * Current state, read from the database.
 *
 * The form must not take this from the session: the JWT is re-synced only every
 * few minutes, so right after saving — and for a while after a reload — it still
 * reports the previous answer. That is what made the switch look stuck on.
 */
export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const stored = await prisma.user.findUnique({
		where: { id: currentUser.id },
		select: { roles: true },
	});

	return json({ enabled: Boolean(stored?.roles.includes(UserRole.Mentor)) });
});

export const PUT = withAuth({ mode: "user" })(
	withValidation(MentorshipSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const { enabled, specialityId, timeForMentoring, openForQuestions } =
			body as MentorshipBody;

		// Roles come from the database, not from the session. The JWT is re-synced
		// at most once every few minutes, so writing back a mutated copy of it
		// resurrected whatever the token still remembered — which is why switching
		// mentorship off came back on by itself.
		const stored = await prisma.user.findUnique({
			where: { id: currentUser.id },
			select: { roles: true },
		});

		if (!stored) return apiError.notFound("User not found");

		const roles = new Set(stored.roles);

		if (enabled) roles.add(UserRole.Mentor);
		else roles.delete(UserRole.Mentor);

		await prisma.user.update({
			where: { id: currentUser.id },
			data: { roles: { set: [...roles] } },
		});

		// The details stay on the speciality and are left alone when mentorship is
		// switched off: turning it back on should not mean filling in the questions
		// again.
		if (enabled && specialityId) {
			await prisma.speciality.update({
				where: { id: specialityId },
				data: {
					timeForMentoring: timeForMentoring || null,
					...(openForQuestions
						? { openForQuestions: { set: openForQuestions } }
						: {}),
				},
			});
		}

		return json({ enabled });
	}),
);
