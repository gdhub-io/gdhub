import { apiError, json, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

type Params = Promise<{ token: string }>;

export const GET = withAuth({ mode: "user" })(async (_req, ctx) => {
	const { token } = await (ctx.params as Params);

	try {
		const invitation = await prisma.teamInvitation.findUnique({
			where: { id: token },
			include: {
				team: {
					select: {
						id: true,
						name: true,
						project: { select: { id: true, name: true, slug: true } },
					},
				},
				invitedBy: { select: { id: true, name: true, email: true } },
			},
		});

		if (!invitation) {
			return apiError.notFound("Invitation not found");
		}

		if (invitation.expiresAt && new Date() > invitation.expiresAt) {
			return apiError.badRequest("Invitation has expired");
		}

		return json(invitation);
	} catch (error) {
		console.error("[invitation.get]", error);
		return apiError.internal(
			error instanceof Error ? error.message : "Unknown error",
		);
	}
});
