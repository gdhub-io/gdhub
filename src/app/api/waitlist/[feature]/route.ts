import { z } from "zod";
import { WaitlistFeature } from "@/config/prisma-enums";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { isOnWaitlist, joinWaitlist } from "@/repositories/feature-waitlist";

const FeatureSchema = z.nativeEnum(WaitlistFeature);

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

/** Puts the signed-in user's email on the waitlist; a repeat changes nothing. */
export const POST = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const current = user as SessionUser | undefined;
	if (!current?.email) return apiError.unauthorized();
	const feature = await featureOf(ctx);
	if (!feature.success) return apiError.notFound();
	await joinWaitlist(feature.data, current.email);
	return json({ joined: true });
});
