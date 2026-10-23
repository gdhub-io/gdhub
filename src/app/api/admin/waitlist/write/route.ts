import { z } from "zod";
import { CHECKPOINT_ENTRY_HREF } from "@/components/checkpoints/entry/hrefs";
import { WaitlistFeature } from "@/config/prisma-enums";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { writeToWaitlist } from "@/repositories/feature-waitlist";
import { appUrl } from "@/services/checkpoint-notifications";

const WriteSchema = z.object({
	feature: z.nativeEnum(WaitlistFeature),
	ids: z.array(z.string().min(1)).min(1).max(1000).optional(),
	title: z.string().trim().min(1).max(120),
	message: z.string().trim().min(1).max(2000),
});

// The button in the letter: where each feature is taken up.
const LINK: Record<WaitlistFeature, string> = {
	ExpertCheckpoint: CHECKPOINT_ENTRY_HREF,
	ScoutSpace: "/scout",
};

/** Frame 13.8a: write to everyone on a waitlist, or to the rows chosen. */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.manage" }),
	withValidation(WriteSchema),
)(async (_req, _ctx, { user, body }) => {
	const admin = user as SessionUser | undefined;
	if (!admin) return apiError.unauthorized();
	const { feature, ids, title, message } = body as z.infer<typeof WriteSchema>;

	return json(
		await writeToWaitlist(admin.id, feature, {
			ids,
			title,
			message,
			redirectUrl: `${appUrl()}${LINK[feature]}`,
		}),
	);
});
