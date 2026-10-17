import { apiError, json, type RouteContext } from "@/lib/api-handlers";
import { getVerifyCertificate } from "../_helpers";

export const GET = async (
	_req: Request,
	ctx: RouteContext<{ number: string }>,
) => {
	const { number } = await ctx.params;
	const data = await getVerifyCertificate(number);
	if (!data) {
		return apiError.notFound("Certificate not found");
	}
	return json(data);
};
