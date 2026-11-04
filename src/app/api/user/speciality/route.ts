import { InvitationStatus, SkillLevel } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { invitationAddressedTo } from "@/lib/team-invitation";
import { prisma } from "@/services/prisma";

const optionalText = z.string().nullish();

// The fields the speciality form edits; anything else (isFeatured, userId, viewsCount) is not the user's to set.
const SpecialityFieldsSchema = z.object({
	name: z.string().trim().min(1),
	level: z.nativeEnum(SkillLevel),
	workDirectionId: z.string().min(1),
	specialization: z.string(),
	summary: optionalText,
	portfolioUrl: optionalText,
	skills: optionalText,
	tools: optionalText,
	jobs: optionalText,
	schools: optionalText,
});

const CreateSpecialitySchema = z.object({
	data: SpecialityFieldsSchema.extend({
		teamInvitationId: z.string().nullish(),
	}),
});

const UpdateSpecialitySchema = z.object({
	id: z.string().min(1),
	data: SpecialityFieldsSchema.partial(),
});

export const GET = withAuth({ mode: "user" })(async (req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const url = new URL(req.url);
	const id = url.searchParams.get("id");
	if (!id) return apiError.badRequest("id is required");

	const speciality = await prisma.speciality.findFirst({
		where: { userId: currentUser.id, id },
		include: { direction: true },
	});

	return json(speciality);
});

export const POST = pipe(
	withAuth({ mode: "user" }),
	withValidation(CreateSpecialitySchema),
)(async (_req, _ctx, { user: sessionUser, body }) => {
	const user = sessionUser as SessionUser;
	const { teamInvitationId, ...fields } = (
		body as z.infer<typeof CreateSpecialitySchema>
	).data;

	const invitation = teamInvitationId
		? await prisma.teamInvitation.findUnique({
				where: { id: teamInvitationId },
				select: {
					id: true,
					email: true,
					userId: true,
					status: true,
					expiresAt: true,
				},
			})
		: null;

	if (teamInvitationId) {
		if (!invitation || !invitationAddressedTo(invitation, user)) {
			return apiError.forbidden();
		}
		// Accepted is still valid: the accept-invite flow marks it before sending the user here.
		const open =
			invitation.status === InvitationStatus.Pending ||
			invitation.status === InvitationStatus.Accepted;
		if (!open || (invitation.expiresAt && invitation.expiresAt <= new Date())) {
			return apiError.badRequest("Invitation is no longer valid");
		}
	}

	await prisma.speciality.create({
		data: { ...fields, userId: user.id },
	});

	if (invitation?.status === InvitationStatus.Pending) {
		await prisma.teamInvitation.update({
			where: { id: invitation.id },
			data: { status: InvitationStatus.Accepted },
		});
	}

	// Adding a speciality used to push `UserRole.Member`. Hub membership is
	// written when onboarding completes; having a speciality is not what makes
	// someone a member.
	return json(null);
});

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withValidation(UpdateSpecialitySchema),
)(async (_req, _ctx, { user: sessionUser, body }) => {
	const user = sessionUser as SessionUser;
	const { id, data } = body as z.infer<typeof UpdateSpecialitySchema>;

	const { count } = await prisma.speciality.updateMany({
		where: { id, userId: user.id },
		data,
	});

	if (count === 0) return apiError.notFound();

	return json(null);
});

export const DELETE = withAuth({ mode: "user" })(
	async (req, _ctx, { user }) => {
		const id = new URL(req.url).searchParams.get("id");
		if (!id) return apiError.badRequest("id is required");

		const { count } = await prisma.speciality.deleteMany({
			where: { id, userId: user.id },
		});

		if (count === 0) return apiError.notFound();

		return json(null);
	},
);
