import { apiError, json, type RouteContext } from "@/lib/api-handlers";
import {
	resolvePublicCertificate,
	type VerifyCertificateResponse,
} from "../_helpers";

export const GET = async (
	_req: Request,
	ctx: RouteContext<{ number: string }>,
) => {
	const { number } = await ctx.params;
	const data = await resolvePublicCertificate(number);

	if (!data) {
		return apiError.notFound("Certificate not found");
	}

	const response: VerifyCertificateResponse = {
		number: data.certificate.number,
		issuedAt: data.certificate.issuedAt.toISOString(),
		participant: {
			name: data.participantName,
			image: data.participantImage,
			position: data.participantPosition || null,
			specialty: data.participantSpecialty || null,
		},
		event: {
			id: data.event.id,
			slug: data.event.slug,
			lang: data.event.lang,
			title: data.event.title,
			type: data.event.type,
			startDate: data.startDate?.toISOString() ?? null,
			endDate: data.endDate?.toISOString() ?? null,
			organizerName: data.organizerName,
			organizerTitle: data.organizerTitle,
			mentorName: data.mentorName || null,
			mentorSpecialty: data.mentorSpecialty || null,
		},
		project: data.project
			? {
					name: data.project.name,
					slug: data.project.slug,
					coverImage: data.project.coverImage,
					shortDescription: data.project.description,
				}
			: null,
	};

	return json(response);
};
