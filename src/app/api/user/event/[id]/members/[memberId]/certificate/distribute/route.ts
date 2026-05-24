import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { LegalService } from "@/services/legal";
import { prisma } from "@/services/prisma";

export const POST = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id, memberId } = (await ctx.params) as {
		id: string;
		memberId: string;
	};
	const isAdmin = currentUser.roles?.includes(prismaClient.UserRole.Admin);

	const member = await prisma.eventMember.findUnique({
		where: { id: memberId },
		select: {
			eventId: true,
			event: { select: { createdById: true } },
			certificate: true,
		},
	});

	if (!member || member.eventId !== id) {
		return apiError.notFound("Member not found");
	}

	if (!isAdmin && member.event.createdById !== currentUser.id) {
		return apiError.forbidden(
			"You are not allowed to manage certificates for this event",
		);
	}

	if (!member.certificate) {
		return apiError.notFound("Certificate has not been created yet");
	}

	const externalId = member.certificate.externalId;
	if (externalId.startsWith("pending:")) {
		return apiError.badRequest(
			"Certificate document was not uploaded to Documenso",
		);
	}

	await new LegalService().distributeEnvelope(externalId);

	return json({ ok: true });
});
