import { type BlogPost, UserRole } from "@gdhub-io/gdhub-prisma";
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
	blogPostMessageDiscord,
	blogPostMessageLinkedIn,
	blogPostMessageTelegram,
	blogPostOgImage,
} from "@/services/telegram/messages";

type Channel = "linkedin" | "discord" | "telegram";

type BlogPostForMessage = Pick<
	BlogPost,
	"title" | "content" | "slug" | "image"
>;

const ChannelSchema = z.object({
	channel: z.enum(["linkedin", "discord", "telegram"]),
});

/** The exact text sent to a channel — shared by the preview (GET) and the send (POST). */
const buildMessage = (channel: Channel, post: BlogPostForMessage) => {
	switch (channel) {
		case "telegram":
			return blogPostMessageTelegram(post);
		case "discord":
			return blogPostMessageDiscord(post);
		case "linkedin":
			return blogPostMessageLinkedIn(post);
	}
};

const loadPost = (id: string) =>
	prisma.blogPost.findUnique({
		where: { id },
		select: { title: true, content: true, slug: true, image: true },
	});

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
		if (!post) return apiError.notFound("Blog post not found");

		return json({
			channel,
			message: buildMessage(channel, post),
			// LinkedIn attaches no explicit image — its card is built from the link's OG tags.
			image: channel === "linkedin" ? null : blogPostOgImage(post),
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
		if (!post) return apiError.notFound("Blog post not found");
		if (!post.slug) {
			return apiError.badRequest("Blog post has no slug to link to");
		}

		if (channel === "telegram") {
			if (!process.env.TELEGRAM_BOT_TOKEN) {
				return apiError.badRequest("Telegram is not configured");
			}
			await TelegramService.init().sendBlogPost(post);
			return json({ ok: true });
		}

		if (channel === "discord") {
			if (!process.env.DISCORD_BOT_TOKEN) {
				return apiError.badRequest("Discord is not configured");
			}
			const result = await DiscordService.init().sendPlatformNewsMessage(
				blogPostMessageDiscord(post),
				blogPostOgImage(post),
			);
			if (!result.ok) return apiError.internal("Failed to post to Discord");
			return json({ ok: true });
		}

		// channel === "linkedin"
		if (!LinkedInService.isConfigured()) {
			return apiError.badRequest("LinkedIn is not configured");
		}
		const result = await LinkedInService.init().sharePost(
			blogPostMessageLinkedIn(post),
		);
		if (!result.ok) return apiError.internal("Failed to post to LinkedIn");
		return json({ ok: true });
	}),
);
