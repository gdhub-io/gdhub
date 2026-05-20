import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";

const LiveTokenQuerySchema = z.object({
	roomName: z.string(),
});

type LiveTokenQuery = z.infer<typeof LiveTokenQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		LiveTokenQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { roomName } = body as LiveTokenQuery;

		const isAdmin = currentUser.roles?.includes(prismaClient.UserRole.Admin);

		const response = await fetch("https://api.daily.co/v1/meeting-tokens", {
			method: "post",
			body: JSON.stringify({
				properties: {
					room_name: isAdmin ? undefined : roomName,
					is_owner: isAdmin || false,
					user_name: currentUser.name,
					enable_screenshare: true,
					lang: "user",
					permissions: {
						hasPresence: true,
						canSend: true,
						canAdmin: isAdmin || false,
					},
				},
			}),
			headers: {
				Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
			},
		});

		const data = await response.json();

		return json({ token: data.token });
	}),
);
