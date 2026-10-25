import { z } from "zod";
import {
	apiError,
	type Handler,
	json,
	pipe,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { labCatalogue, runLab } from "@/services/ai-curator-lab";

export const dynamic = "force-dynamic";
/** A sprint review reads its media and describes it before the review itself. */
export const maxDuration = 120;

const RunSchema = z.object({ call: z.string(), input: z.unknown() });

/** The space does not exist in production, and neither does its API. */
const devOnly =
	(handler: Handler): Handler =>
	(req, ctx, locals) =>
		process.env.NODE_ENV === "production"
			? apiError.notFound()
			: handler(req, ctx, locals);

const guard = [
	devOnly,
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
	const { call, input } = body as z.infer<typeof RunSchema>;
	const ran = await runLab(call, input);
	return "error" in ran ? json(ran, { status: 400 }) : json(ran);
});
