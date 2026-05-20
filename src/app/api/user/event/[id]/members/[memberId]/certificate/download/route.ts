import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
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
	const isAdmin = currentUser.roles?.includes(prismaClient.UserRole.Admin);

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

	const externalId = eventCtx.member.certificate.externalId;
	if (externalId.startsWith("pending:")) {
		return apiError.notFound(
			"Certificate has not been uploaded to Documenso yet",
		);
	}

	const { bytes, contentType, filename } =
		await new LegalService().downloadSignedDocument(externalId);

	const fallbackName = `${eventCtx.member.certificate.number}.pdf`;
	return new Response(Buffer.from(bytes), {
		headers: {
			"Content-Type": contentType,
			"Content-Disposition": `attachment; filename="${filename ?? fallbackName}"`,
			"Cache-Control": "no-store",
		},
	});
});
