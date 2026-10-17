import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { LegalService } from "@/services/legal";
import { prisma } from "@/services/prisma";

export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "event.certificates.issue",
		idFrom: "params.id",
	}),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id, memberId } = (await ctx.params) as {
		id: string;
		memberId: string;
	};

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

	if (!member.certificate) {
		return apiError.notFound("Certificate has not been created yet");
	}

	const externalId = member.certificate.externalId;
	if (!externalId || externalId.startsWith("pending:")) {
		return apiError.badRequest(
			"Certificate document was not uploaded to Documenso",
		);
	}

	await new LegalService().distributeEnvelope(externalId);

	return json({ ok: true });
});
