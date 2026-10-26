import { z } from "zod";
import {
	json,
	pipe,
	withAuth,
	withDevOnly,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { inRussian } from "@/services/ai-curator-lab/translate";

export const dynamic = "force-dynamic";

const TranslateSchema = z.object({ value: z.unknown() });

/** Frame 12.18.1, "Read data in: Русский": the lab's data translated for reading. */
export const POST = pipe(
	withDevOnly(),
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "dev.tools.use" }),
	withValidation(TranslateSchema),
)(async (_req, _ctx, { body }) => {
	const { value } = body as z.infer<typeof TranslateSchema>;
	return json({ value: await inRussian(value) });
});
