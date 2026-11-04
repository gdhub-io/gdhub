import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { getSpaceAccess, isStaff } from "@/services/access";

const RevalidateSchema = z.object({
	slug: z.string().startsWith("/"),
});

type RevalidateBody = z.infer<typeof RevalidateSchema>;

// Flushing the cache is free work for anyone who can call it, so only platform staff may.
export const POST = withAuth({ mode: "user" })(
	withValidation(RevalidateSchema)(async (_req, _ctx, { user, body }) => {
		const access = await getSpaceAccess("hub", null, user as SessionUser);
		if (!isStaff(access)) return apiError.forbidden();

		const { slug } = body as RevalidateBody;
		revalidatePath(slug);
		return json({ revalidated: true });
	}),
);
