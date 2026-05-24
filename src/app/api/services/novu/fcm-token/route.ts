import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { NovuService } from "@/services/novu";

const FcmTokenSchema = z.object({
	token: z.string(),
	integrationIdentifier: z.string().optional(),
});

type FcmTokenBody = z.infer<typeof FcmTokenSchema>;

export const POST = withAuth({ mode: "user" })(
	withValidation(FcmTokenSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { token, integrationIdentifier } = body as FcmTokenBody;

		await NovuService.updateFcmDeviceTokens({
			subscriberId: currentUser.id,
			deviceTokens: [token],
			integrationIdentifier,
		});

		return json({ success: true });
	}),
);
