import type { NextRequest } from "next/server";
import { apiError, json } from "@/lib/api-handlers";
import { confirmPulse } from "@/repositories/checkpoint-pulse";

/** The pulse page's one button. No session: the signed token is the proof. */
export async function POST(
	_req: NextRequest,
	ctx: { params: Promise<{ token: string }> },
) {
	const { token } = await ctx.params;
	const view = await confirmPulse(token);
	return view ? json(view) : apiError.notFound();
}
