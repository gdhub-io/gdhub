import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { joinCall } from "@/repositories/checkpoint-call";

export const POST = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const caller = user as SessionUser | undefined;
	if (!caller) return apiError.unauthorized();
	const { id, index } = (await ctx.params) as { id: string; index: string };

	const joined = await joinCall(id, Number(index), {
		id: caller.id,
		name: caller.name ?? "",
	});
	if ("refused" in joined) {
		return joined.refused === "notFound"
			? apiError.notFound()
			: apiError.forbidden(joined.refused);
	}
	return json(joined);
});
