import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import SanityService from "@/services/sanity";

const DeleteFileSchema = z.object({
	fileUrl: z.string(),
});

type DeleteFileBody = z.infer<typeof DeleteFileSchema>;

export const POST = withAuth({ mode: "user" })(
	withValidation(DeleteFileSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		try {
			const { fileUrl } = body as DeleteFileBody;
			const response = await SanityService.removeFile(fileUrl);
			return json(response);
		} catch (error: any) {
			console.log("[API ERROR]", error);
			return json({ success: false, error: error?.message });
		}
	}),
);
