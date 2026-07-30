import { UserRole } from "@gdhub-io/gdhub-prisma";
import { apiError, type SessionUser, withAuth } from "@/lib/api-handlers";
import { LegalService } from "@/services/legal";
import { resolveMemberCertificateContext } from "../../../../_helpers";

export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id, memberId } = (await ctx.params) as {
		id: string;
		memberId: string;
	};
	const isAdmin = currentUser.roles?.includes(UserRole.Admin);

	const eventCtx = await resolveMemberCertificateContext(memberId);

	if (!eventCtx || eventCtx.event.id !== id) {
		return apiError.notFound("Member not found");
	}

	if (!isAdmin && eventCtx.event.createdById !== currentUser.id) {
		return apiError.forbidden(
			"You are not allowed to view certificates for this event",
		);
	}

	if (!eventCtx.member.certificate) {
		return apiError.notFound("Certificate has not been created yet");
	}

	const legalService = new LegalService();
	const pdfBytes = await legalService.generateEventCertificatePdf({
		eventType: eventCtx.event.type,
		organizerName: eventCtx.organizerName,
		organizerTitle: eventCtx.organizerTitle,
		startDate: eventCtx.startDate,
		endDate: eventCtx.endDate,
		participantName: eventCtx.participantName,
		participantPosition: eventCtx.participantPosition,
		projectName: eventCtx.projectName,
		eventTitle: eventCtx.event.title,
		certificateNumber: eventCtx.member.certificate.number,
		issuedDate: eventCtx.member.certificate.issuedAt,
		mentorName: eventCtx.mentorName,
	});

	return new Response(Buffer.from(pdfBytes), {
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `inline; filename="${eventCtx.member.certificate.number}.pdf"`,
			"Cache-Control": "no-store",
		},
	});
});
