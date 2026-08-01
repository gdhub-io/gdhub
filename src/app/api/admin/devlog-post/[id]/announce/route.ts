import { UserRole } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import DiscordService from "@/services/discord";
import LinkedInService from "@/services/linkedin";
import { prisma } from "@/services/prisma";
import TelegramService from "@/services/telegram";
import {
	type DevlogPostForMessage,
	devlogOgImage,
	devlogPostMessageDiscord,
	devlogPostMessageLinkedIn,
	devlogPostMessageTelegram,
} from "@/services/telegram/messages";

type Channel = "linkedin" | "discord" | "telegram";

const ChannelSchema = z.object({
	channel: z.enum(["linkedin", "discord", "telegram"]),
});

/** The exact text sent to a channel — shared by the preview (GET) and the send (POST). */
const buildMessage = (channel: Channel, post: DevlogPostForMessage) => {
	switch (channel) {
		case "telegram":
			return devlogPostMessageTelegram(post);
		case "discord":
			return devlogPostMessageDiscord(post);
		case "linkedin":
			return devlogPostMessageLinkedIn(post);
	}
};

const loadPost = (id: string) =>
	prisma.projectReport.findUnique({
		where: { id },
		select: {
			id: true,
			content: true,
			contentEditor: true,
			isSystem: true,
			project: { select: { name: true, coverImage: true } },
		},
	});

// Generated posts carry no editorial content and have no public page to link
// to, so they are never announced — only devlogs written by users are.
const SYSTEM_POST_ERROR = "Generated posts are not announced";

// Preview: return the message that would be posted, without sending anything.
export const GET = withAuth({
	mode: "user",
	roles: [UserRole.Admin],
})(
	withValidation(
		ChannelSchema,
		"query",
	)(async (_req, ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const { id } = (await ctx.params) as { id: string };
		const { channel } = body as z.infer<typeof ChannelSchema>;

		const post = await loadPost(id);
		if (!post) return apiError.notFound("DevLog post not found");
		if (post.isSystem) return apiError.badRequest(SYSTEM_POST_ERROR);

		return json({
			channel,
			message: buildMessage(channel, post),
			// LinkedIn attaches no explicit image — its card is built from the link's OG tags.
			image: channel === "linkedin" ? null : devlogOgImage(post),
		});
	}),
);

export const POST = withAuth({
	mode: "user",
	roles: [UserRole.Admin],
})(
	withValidation(ChannelSchema)(async (_req, ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const { id } = (await ctx.params) as { id: string };
		const { channel } = body as z.infer<typeof ChannelSchema>;

		const post = await loadPost(id);
		if (!post) return apiError.notFound("DevLog post not found");
		if (post.isSystem) return apiError.badRequest(SYSTEM_POST_ERROR);

		if (channel === "telegram") {
			if (!process.env.TELEGRAM_BOT_TOKEN) {
				return apiError.badRequest("Telegram is not configured");
			}
			await TelegramService.init().sendDevlogPost(post);
			return json({ ok: true });
		}

		if (channel === "discord") {
			if (!process.env.DISCORD_BOT_TOKEN) {
				return apiError.badRequest("Discord is not configured");
			}
			const result = await DiscordService.init().sendProjectNewsMessage(
				devlogPostMessageDiscord(post),
				devlogOgImage(post),
			);
			if (!result.ok) return apiError.internal("Failed to post to Discord");
			return json({ ok: true });
		}

		// channel === "linkedin"
		if (!LinkedInService.isConfigured()) {
			return apiError.badRequest("LinkedIn is not configured");
		}
		const result = await LinkedInService.init().sharePost(
			devlogPostMessageLinkedIn(post),
		);
		if (!result.ok) return apiError.internal("Failed to post to LinkedIn");
		return json({ ok: true });
	}),
);
