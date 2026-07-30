import { UserRole } from "@gdhub-io/gdhub-prisma";
import { apiError, type SessionUser, withAuth } from "@/lib/api-handlers";
import { LegalService } from "@/services/legal";
import { resolveEventCertificationContext } from "../../../_helpers";

export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const isAdmin = currentUser.roles?.includes(UserRole.Admin);

	const eventCtx = await resolveEventCertificationContext(id);

	if (!eventCtx) {
		return apiError.notFound("Event not found");
	}

	if (!isAdmin && eventCtx.createdById !== currentUser.id) {
		return apiError.forbidden(
			"You are not allowed to view certification for this event",
		);
	}

	const legalService = new LegalService();
	const pdfBytes = await legalService.generateEventCertificatePdf({
		eventType: eventCtx.type,
		organizerName: eventCtx.effectiveOrganizerName,
		organizerTitle: eventCtx.effectiveOrganizerTitle,
		startDate: eventCtx.startDate,
		endDate: eventCtx.endDate,
	});

	return new Response(Buffer.from(pdfBytes), {
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": 'inline; filename="certificate-preview.pdf"',
			"Cache-Control": "no-store",
		},
	});
});
