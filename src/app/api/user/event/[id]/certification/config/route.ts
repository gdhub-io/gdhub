import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { prisma } from "@/services/prisma";
import { resolveEventCertificationContext } from "../../_helpers";

const CertificationConfigSchema = z.object({
	organizerName: z.string().nullable().optional(),
	organizerTitle: z.string().nullable().optional(),
});

type CertificationConfigBody = z.infer<typeof CertificationConfigSchema>;

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

	return json({
		organizerName: eventCtx.storedOrganizerName,
		organizerTitle: eventCtx.storedOrganizerTitle,
		defaults: {
			organizerName: eventCtx.defaultOrganizerName,
			organizerTitle: eventCtx.defaultOrganizerTitle,
		},
	});
});

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "event.certificates.issue",
		idFrom: "params.id",
	}),
	withValidation(CertificationConfigSchema),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const data = body as CertificationConfigBody;

	const event = await prisma.event.findUnique({
		where: { id },
		select: { createdById: true },
	});

	if (!event) {
		return apiError.notFound("Event not found");
	}

	const normalize = (v: string | null | undefined) => {
		if (v === undefined) return undefined;
		if (v === null) return null;
		const trimmed = v.trim();
		return trimmed === "" ? null : trimmed;
	};

	await prisma.event.update({
		where: { id },
		data: {
			certificationOrganizerName: normalize(data.organizerName),
			certificationOrganizerTitle: normalize(data.organizerTitle),
		},
	});

	return json({ ok: true });
});
