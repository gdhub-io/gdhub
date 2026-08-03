import { apiError, pipe, type SessionUser, withAuth } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { LegalService } from "@/services/legal";
import { resolveEventCertificationContext } from "../../../_helpers";

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "event.certificates.view",
		idFrom: "params.id",
	}),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };

	const eventCtx = await resolveEventCertificationContext(id);

	if (!eventCtx) {
		return apiError.notFound("Event not found");
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
