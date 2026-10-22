import type { NextRequest } from "next/server";
import { z } from "zod";
import { WaitlistFeature } from "@/config/prisma-enums";
import { clientIp } from "@/helpers/request";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { limitAiCalls } from "@/lib/rate-limit";
import { isOnWaitlist, joinWaitlist } from "@/repositories/feature-waitlist";

const FeatureSchema = z.nativeEnum(WaitlistFeature);
const GuestSchema = z.object({ email: z.string().trim().email().max(254) });

const featureOf = async (ctx: { params: Promise<unknown> }) =>
	FeatureSchema.safeParse(((await ctx.params) as { feature: string }).feature);

/** Whether the signed-in user already waits for the feature. */
export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const current = user as SessionUser | undefined;
	if (!current?.email) return apiError.unauthorized();
	const feature = await featureOf(ctx);
	if (!feature.success) return apiError.notFound();
	return json({ joined: await isOnWaitlist(feature.data, current.email) });
});

/**
 * Puts an email on the waitlist; a repeat changes nothing. Signed in, it is the
 * account's; a guest on the landing sends one, limited per address.
 */
export const POST = withAuth({ mode: "any" })(
	async (req: NextRequest, ctx, { user }) => {
		const feature = await featureOf(ctx);
		if (!feature.success) return apiError.notFound();

		let email = (user as SessionUser | null)?.email;
		if (!email) {
			const limited = await limitAiCalls(
				"waitlist",
				clientIp(req) || "unknown",
			);
			if (limited) return limited;
			const body = GuestSchema.safeParse(await req.json().catch(() => null));
			if (!body.success) return apiError.badRequest("invalidEmail");
			email = body.data.email;
		}

		await joinWaitlist(feature.data, email);
		return json({ joined: true });
	},
);
