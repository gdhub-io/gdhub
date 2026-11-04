import { z } from "zod";
import {
	json,
	pipe,
	withAuth,
	withDevOnly,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { labCatalogue, runLab } from "@/services/checkpoints/ai-curator-lab";

export const dynamic = "force-dynamic";
/** A sprint review reads its media and describes it before the review itself. */
export const maxDuration = 120;

const RunSchema = z.object({
	call: z.string(),
	input: z.unknown(),
	language: z.enum(["en", "ru"]).default("en"),
	persona: z.string().optional(),
});

const guard = [
	withDevOnly(),
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "dev.tools.use" }),
] as const;

/** Frame 12.18.1: the calls, their situations, and the models they run on. */
export const GET = pipe(...guard)(async () => json(labCatalogue()));

/** Runs one call on the input as given: real model calls, nothing written. */
export const POST = pipe(
	...guard,
	withValidation(RunSchema),
)(async (_req, _ctx, { body }) => {
	const { call, input, language, persona } = body as z.infer<typeof RunSchema>;
	const ran = await runLab(call, input, language, persona);
	return "error" in ran ? json(ran, { status: 400 }) : json(ran);
});
