import { EventStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import DiscordService from "@/services/discord";
import LinkedInService from "@/services/linkedin";
import { prisma } from "@/services/prisma";
import TelegramService from "@/services/telegram";
import {
	type EventForMessage,
	eventMessageDiscord,
	eventMessageLinkedIn,
	eventMessageTelegram,
	eventOgImage,
} from "@/services/telegram/messages";

type Channel = "linkedin" | "discord" | "telegram";

const ChannelSchema = z.object({
	channel: z.enum(["linkedin", "discord", "telegram"]),
});

/** The exact text sent to a channel — shared by the preview (GET) and the send (POST). */
const buildMessage = (channel: Channel, event: EventForMessage) => {
	switch (channel) {
		case "telegram":
			return eventMessageTelegram(event);
		case "discord":
			return eventMessageDiscord(event);
		case "linkedin":
			return eventMessageLinkedIn(event);
	}
};

const loadEvent = (id: string) =>
	prisma.event.findUnique({
		where: { id },
		select: {
			title: true,
			slug: true,
			shortDescription: true,
			image: true,
			type: true,
			status: true,
			schedule: {
				orderBy: { startDate: "asc" as const },
				select: { startDate: true, endDate: true },
			},
		},
	});

// An announcement is a link to a public page. Posting a draft would send people
// to a 404, and posting an event with no slug has no page to link to at all.
const NOT_PUBLIC_ERROR = "Only a published event can be announced";

// Preview: return the message that would be posted, without sending anything.
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.events.view" }),
	withValidation(ChannelSchema, "query"),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const { channel } = body as z.infer<typeof ChannelSchema>;

	const event = await loadEvent(id);
	if (!event) return apiError.notFound("Event not found");
	if (event.status !== EventStatus.Published || !event.slug) {
		return apiError.badRequest(NOT_PUBLIC_ERROR);
	}

	return json({
		channel,
		message: buildMessage(channel, event),
		// LinkedIn attaches no explicit image — its card is built from the link's OG tags.
		image: channel === "linkedin" ? null : eventOgImage(event),
	});
});

export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.events.manage" }),
	withValidation(ChannelSchema),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const { channel } = body as z.infer<typeof ChannelSchema>;

	const event = await loadEvent(id);
	if (!event) return apiError.notFound("Event not found");
	if (event.status !== EventStatus.Published || !event.slug) {
		return apiError.badRequest(NOT_PUBLIC_ERROR);
	}

	if (channel === "telegram") {
		if (!process.env.TELEGRAM_BOT_TOKEN) {
			return apiError.badRequest("Telegram is not configured");
		}
		await TelegramService.init().sendEvent(event);
		return json({ ok: true });
	}

	if (channel === "discord") {
		if (!process.env.DISCORD_BOT_TOKEN) {
			return apiError.badRequest("Discord is not configured");
		}
		const result = await DiscordService.init().sendProjectNewsMessage(
			eventMessageDiscord(event),
			eventOgImage(event),
		);
		if (!result.ok) return apiError.internal("Failed to post to Discord");
		return json({ ok: true });
	}

	// channel === "linkedin"
	if (!LinkedInService.isConfigured()) {
		return apiError.badRequest("LinkedIn is not configured");
	}
	const result = await LinkedInService.init().sharePost(
		eventMessageLinkedIn(event),
	);
	if (!result.ok) return apiError.internal("Failed to post to LinkedIn");
	return json({ ok: true });
});
