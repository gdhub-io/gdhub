import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";
import { resolveEventCertificationContext } from "../../_helpers";

const CertificationConfigSchema = z.object({
	organizerName: z.string().nullable().optional(),
	organizerTitle: z.string().nullable().optional(),
});

type CertificationConfigBody = z.infer<typeof CertificationConfigSchema>;

export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const isAdmin = currentUser.roles?.includes(prismaClient.UserRole.Admin);

	const eventCtx = await resolveEventCertificationContext(id);

	if (!eventCtx) {
		return apiError.notFound("Event not found");
	}

	if (!isAdmin && eventCtx.createdById !== currentUser.id) {
		return apiError.forbidden(
			"You are not allowed to view certification for this event",
		);
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

export const PUT = withAuth({ mode: "user" })(
	withValidation(CertificationConfigSchema)(
		async (_req, ctx, { user, body }) => {
			const currentUser = user as SessionUser | undefined;
			if (!currentUser) return apiError.unauthorized();

			const { id } = (await ctx.params) as { id: string };
			const data = body as CertificationConfigBody;
			const isAdmin = currentUser.roles?.includes(prismaClient.UserRole.Admin);

			const event = await prisma.event.findUnique({
				where: { id },
				select: { createdById: true },
			});

			if (!event) {
				return apiError.notFound("Event not found");
			}

			if (!isAdmin && event.createdById !== currentUser.id) {
				return apiError.forbidden(
					"You are not allowed to manage certification for this event",
				);
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
		},
	),
);
