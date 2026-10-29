import { z } from "zod";
import { apiError, json, withValidation } from "@/lib/api-handlers";
import { dailyEmulated } from "@/lib/stand";
import {
	emulatedPresence,
	emulatedRecording,
	emulatedRoom,
	isNotFound,
} from "@/services/daily-emulated";

/**
 * The emulated Daily's other side, on the e2e stand only (GDHUB-116): the
 * browser's fake call object joins, leaves and watches its room here, and a
 * test finishes a room's recording before signing Daily's webhook for it.
 */
const ActionSchema = z.discriminatedUnion("action", [
	z.object({ action: z.enum(["join", "leave"]), token: z.string() }),
	z.object({ action: z.literal("recording"), room: z.string() }),
]);

export const GET = async (req: Request) => {
	if (!dailyEmulated()) return apiError.notFound();
	const room = new URL(req.url).searchParams.get("room") ?? "";
	return json(emulatedRoom(room));
};

export const POST = withValidation(ActionSchema)(
	async (_req, _ctx, { body: input }) => {
		if (!dailyEmulated()) return apiError.notFound();
		try {
			if (input.action === "recording") {
				return json({ recordingId: emulatedRecording(input.room) });
			}
			const grant = emulatedPresence(input.token, input.action === "join");
			return json({ room: grant.room, userId: grant.userId });
		} catch (error) {
			if (isNotFound(error)) return apiError.notFound();
			throw error;
		}
	},
);
