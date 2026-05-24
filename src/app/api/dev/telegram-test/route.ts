import { z } from "zod";
import { apiError, json, withValidation } from "@/lib/api-handlers";
import TelegramService from "@/services/telegram";

if (process.env.NODE_ENV === "production") {
	throw new Error("dev/telegram-test must not be loaded in production");
}

const TelegramTestSchema = z.object({
	chatId: z.coerce.number(),
	topicId: z.coerce.number().optional(),
	message: z.string().min(1),
});

type TelegramTestBody = z.infer<typeof TelegramTestSchema>;

export const POST = withValidation(TelegramTestSchema)(
	async (_req, _ctx, { body }) => {
		const { chatId, topicId, message } = body as TelegramTestBody;

		if (!process.env.TELEGRAM_BOT_TOKEN) {
			return apiError.internal("TELEGRAM_BOT_TOKEN is not set");
		}

		const bot = TelegramService.init();

		try {
			const result = await bot.sendMessage({ chatId, topicId, message });
			return json({ ok: true, telegram: result });
		} catch (e: unknown) {
			const axiosErr = e as { response?: { status: number; data: unknown } };
			return json(
				{
					ok: false,
					error:
						axiosErr.response?.data ??
						(e instanceof Error ? e.message : String(e)),
					status: axiosErr.response?.status,
				},
				{ status: 502 },
			);
		}
	},
);

export const GET = async () => {
	if (!process.env.TELEGRAM_BOT_TOKEN) {
		return json({ ok: false, reason: "TELEGRAM_BOT_TOKEN not set" });
	}

	const mode =
		process.env.TELEGRAM_BOT_API_MODE === "test" ? "test" : "production";
	const bot = TelegramService.init();
	const health = await bot.health();
	return json({ ...health, mode });
};
