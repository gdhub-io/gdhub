import { Client, GatewayIntentBits, type TextChannel } from "discord.js";

export default class DiscordService {
	private client: Client;
	private platformNewsChannelId: string;
	private projectNewsChannelId: string;
	private loginPromise?: Promise<string>;
	private botToken?: string;

	private constructor({ botToken }: { botToken: string }) {
		this.botToken = botToken;
		this.platformNewsChannelId = process.env.DISCORD_NEWS_CHANNEL_ID as string;
		this.projectNewsChannelId = process.env
			.DISCORD_PROJECT_NEWS_CHANNEL_ID as string;
		this.client = new Client({
			intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
		});

		this.client.once("ready", () => {
			console.log(`${this.client.user?.username} is online!`);
		});
	}

	static init(botToken?: string) {
		const token = botToken || (process.env.DISCORD_BOT_TOKEN as string);

		if (!token) throw new Error("DISCORD_BOT_TOKEN is not set");

		return new DiscordService({ botToken: token });
	}

	private async ensureReady() {
		if (this.client.isReady()) return;
		if (!this.loginPromise) {
			this.loginPromise = this.client.login(this.botToken);
		}
		await this.loginPromise;
	}

	async sendProjectNewsMessage(message: string, imageUrl?: string) {
		try {
			await this.ensureReady();

			const channel = await this.client.channels.fetch(
				this.projectNewsChannelId,
			);

			if (!channel || !channel.isTextBased()) {
				throw new Error("Discord channel is not text-based or not found");
			}

			await (channel as TextChannel).send({
				content: message,
				embeds: imageUrl ? [{ image: { url: imageUrl } }] : undefined,
			});

			return { ok: true };
		} catch (error) {
			console.error("[DiscordService.sendProjectNewsMessage]", error);
			return { ok: false };
		}
	}

	async sendPlatformNewsMessage(message: string, imageUrl?: string) {
		try {
			await this.ensureReady();

			const channel = await this.client.channels.fetch(
				this.platformNewsChannelId,
			);

			if (!channel || !channel.isTextBased()) {
				throw new Error("Discord channel is not text-based or not found");
			}

			await (channel as TextChannel).send({
				content: message,
				embeds: imageUrl ? [{ image: { url: imageUrl } }] : undefined,
			});

			return { ok: true };
		} catch (error) {
			console.error("[DiscordService.sendPlatformNewsMessage]", error);
			return { ok: false };
		}
	}
}
