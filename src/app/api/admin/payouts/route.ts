import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { MS_PER_HOUR } from "@/lib/checkpoints/days";

/** The furthest zone ahead of UTC: its today is the latest calendar day anywhere. */
const LATEST_ZONE_HOURS = 14;

import { withSpaceGuard } from "@/lib/space-guard";
import { listPayouts } from "@/repositories/checkpoints/payouts";
import { markPayoutPaid } from "@/services/checkpoints/flows/payouts";

/** `2026-09` → its first day, UTC. */
const Month = z
	.string()
	.regex(/^\d{4}-\d{2}$/)
	.transform((value) => new Date(`${value}-01T00:00:00.000Z`));

const QuerySchema = z.object({ month: Month });

/** Frame 13.2: one month's payouts. */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.payouts.view" }),
	withValidation(QuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { month } = body as z.infer<typeof QuerySchema>;
	return json(await listPayouts(month));
});

const MarkPaidSchema = z.object({
	curatorId: z.string().min(1),
	month: Month,
	// A calendar day in the admin's own zone: no later than today anywhere (UTC+14).
	paidOn: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.refine(
			(day) =>
				day <=
				new Date(Date.now() + LATEST_ZONE_HOURS * MS_PER_HOUR)
					.toISOString()
					.slice(0, 10),
			"A transfer can't be in the future",
		)
		.transform((day) => new Date(`${day}T00:00:00.000Z`)),
	reference: z.string().trim().min(1).max(140),
	detailsSeenAt: z.coerce.date(),
});

/** Frame 13.3: the bank transfer went out. */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.payouts.manage" }),
	withValidation(MarkPaidSchema),
)(async (_req, _ctx, { user, body }) => {
	const admin = user as SessionUser | undefined;
	if (!admin) return apiError.unauthorized();

	const result = await markPayoutPaid(
		admin.id,
		body as z.infer<typeof MarkPaidSchema>,
	);
	if (result.ok) return json({ amount: result.amount });
	if (result.error === "alreadyPaid") {
		return apiError.conflict(result.error, { paid: result.paid });
	}
	if (result.error === "detailsChanged") return apiError.conflict(result.error);
	return apiError.badRequest(result.error);
});
