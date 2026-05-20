import { apiError, type RouteContext } from "@/lib/api-handlers";
import { LegalService } from "@/services/legal";
import { resolvePublicCertificate } from "../../_helpers";

export const GET = async (
	_req: Request,
	ctx: RouteContext<{ number: string }>,
) => {
	const { number } = await ctx.params;
	const data = await resolvePublicCertificate(number);

	if (!data) {
		return apiError.notFound("Certificate not found");
	}

	const fallbackName = `${data.certificate.number}.pdf`;
	const { bytes, contentType, filename } =
		await new LegalService().downloadSignedDocument(
			data.certificate.externalId,
		);

	return new Response(Buffer.from(bytes), {
		headers: {
			"Content-Type": contentType,
			"Content-Disposition": `inline; filename="${filename ?? fallbackName}"`,
			"Cache-Control": "no-store",
		},
	});
};
