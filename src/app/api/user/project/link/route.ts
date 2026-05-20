import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const ProjectLinkSchema = z.object({
	platform: z.string(),
	link: z.string(),
	isPrimary: z.boolean(),
});

const UserProjectLinksSchema = z.object({
	id: z.string(),
	links: z.array(ProjectLinkSchema).min(1),
});

type UserProjectLinksBody = z.infer<typeof UserProjectLinksSchema>;

export const PUT = withAuth({ mode: "user" })(
	withValidation(UserProjectLinksSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { id, links } = body as UserProjectLinksBody;

		const data = await prisma.project.update({
			where: { id },
			data: { links },
		});

		// Return the updated links in the expected format
		const updatedLinks = (data.links as any[]) || [];
		return json(
			updatedLinks.map((link: any) => ({
				platform: link.platform || "",
				link: link.link || "",
				isPrimary: link.isPrimary || false,
			})),
		);
	}),
);
