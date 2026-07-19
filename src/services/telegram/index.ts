/**
 * Docs page https://telegram-bot-sdk.readme.io/reference/sendmessage
 * Telegram Bot API Docs https://core.telegram.org/bots/api#formatting-options
 */

import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import axios from "axios";
import dayjs from "dayjs";
import { parseInline } from "marked";
import fetch from "node-fetch";
import { env } from "@/helpers/env";
import DiscordService from "../discord";
import LinkedInService from "../linkedin";
import { prisma } from "../prisma";
import {
	blogPostMessageTelegram,
	blogPostOgImage,
	newProjectReportsMessageEn,
	newProjectReportsMessageRu,
	newSpecialitiesMessageEn,
	newSpecialitiesMessageRu,
	newVacanciesMessageDiscord,
	newVacanciesMessageEn,
	newVacanciesMessageLinkedIn,
	newVacanciesMessageRu,
} from "./messages";

export default class TelegramService {
	private apiUrl: string;
	private mode: "test" | "production" = "production";

	private constructor({
		botToken,
		mode,
	}: { botToken: string; mode: "test" | "production" }) {
		this.apiUrl = `https://api.telegram.org/bot${botToken}${mode === "test" ? "/test" : ""}`;
		this.mode = mode;
	}

	static init(botToken?: string) {
		const defaultBotToken = process.env.TELEGRAM_BOT_TOKEN as string;
		const mode =
			process.env.TELEGRAM_BOT_API_MODE === "test" ? "test" : "production";
		return new TelegramService({ botToken: botToken || defaultBotToken, mode });
	}

	async health() {
		try {
			const res = await axios.post(`${this.apiUrl}/getMe`);

			if (!res.data) {
				console.error("Telegram getMe response is wrong");
				return { ok: false };
			}

			return { ok: res.status === 200 };
		} catch (error: unknown) {
			console.error(error);
			return { ok: false };
		}
	}

	prepareChatId(chatId: number | string) {
		// Channel usernames (@name) are passed through as-is.
		if (typeof chatId === "string" && chatId.startsWith("@")) return chatId;
		const preparedChatId =
			this.mode === "test" ? `-100${chatId}` : String(chatId);
		return Number(preparedChatId);
	}

	async sendMessage({
		chatId,
		topicId,
		message,
		options,
	}: {
		chatId: number | string;
		topicId?: number;
		message: string;
		options?: Record<string, unknown>;
	}) {
		const text = await parseInline(message);

		const body = {
			chat_id: this.prepareChatId(chatId),
			message_thread_id: topicId || undefined,
			parse_mode: "HTML",
			disable_notification: process.env.TELEGRAM_DISABLE_NOTIFICATIONS === "1",
			text: text.replace(/<img[^>]*>/g, ""), //1-4096 characters
			reply_markup: options || undefined,
		};

		try {
			const res = await axios.post(`${this.apiUrl}/sendMessage`, body);

			if (!res.data) throw new Error("Telegram sendMessage response is wrong");

			console.info("Message successfully send.");
			return res.data;
		} catch (error: unknown) {
			// Surface Telegram's concise description instead of dumping the whole
			// axios error object (chat not found, not enough rights, etc.).
			const description = axios.isAxiosError(error)
				? error.response?.data?.description || error.message
				: (error as Error).message;
			throw new Error(`Telegram sendMessage failed: ${description}`);
		}
	}

	async sendPhoto({
		chatId,
		topicId,
		url,
		message,
	}: {
		chatId: number | string;
		topicId?: number;
		url: string;
		message?: string;
	}) {
		const body = JSON.stringify({
			chat_id: this.prepareChatId(chatId),
			message_thread_id: topicId || undefined,
			photo: url,
			caption: message, //0-1024 characters
			parse_mode: "HTML",
			disable_notification: process.env.TELEGRAM_DISABLE_NOTIFICATIONS === "1",
		});

		try {
			const res = await fetch(`${this.apiUrl}/sendPhoto`, {
				method: "post",
				body: body,
				headers: {
					accept: "application/json",
					"content-type": "application/json",
				},
			});

			// Telegram signals API errors via a JSON body ({ ok:false, description })
			// often with a non-2xx status. Surface that description so failures like
			// "wrong HTTP URL" (unreachable photo) or "chat not found" are diagnosable.
			const data = (await res.json().catch(() => null)) as {
				ok?: boolean;
				description?: string;
			} | null;

			if (!res.ok || !data?.ok) {
				throw new Error(
					`Telegram sendPhoto failed: ${data?.description || `HTTP ${res.status}`}`,
				);
			}

			console.info("Message successfully send.");
			return data;
		} catch (error: unknown) {
			console.error(error);
			throw error;
		}
	}

	async sendNewProjectReports({ inLastDays = 1 }: { inLastDays?: number }) {
		const lastLog = await prisma.queueJobLog.findFirst({
			where: {
				name: "new-project-reports",
				type: prismaClient.QueueJobType.Broker,
				status: prismaClient.QueueJobStatus.Completed,
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		const lastLogDate = lastLog
			? dayjs(lastLog.createdAt).add(1, "second").toDate()
			: dayjs().subtract(inLastDays, "d").toDate();

		const reports = await prisma.projectReport.findMany({
			where: {
				publishedAt: { gte: lastLogDate },
				project: {
					author: { personalDataDeletedAt: null },
					status: prismaClient.ProjectStatus.Approved,
					workflow: {
						currentStep: {
							name: {
								notIn: ["Introduction", "Ideation"],
								mode: "insensitive",
							},
						},
					},
				},
			},
			include: {
				author: { select: { lang: true } },
				project: { select: { name: true, slug: true } },
			},
		});

		if (reports.length === 0) return { sent: 0 };

		const ruReports = reports.filter((report) => report.author.lang === "ru");
		const enReports = reports.filter((report) => report.author.lang === "en");

		// Send to RU chat
		try {
			if (ruReports.length > 0) {
				const ruReportsMessage = newProjectReportsMessageRu(ruReports);

				await this.sendMessage({
					chatId: env<number>("TELEGRAM_CHAT_ID"),
					topicId: env<number>("TELEGRAM_TOPIC_REPORTS"),
					message: `${ruReportsMessage}`,
				});
			}
		} catch (error) {
			console.error(
				"Error sending message to RU Telegram chat (new project reports)",
				error,
			);
		}

		// Send to EN chat
		try {
			if (enReports.length > 0) {
				const enReportsMessage = newProjectReportsMessageEn(enReports);

				await this.sendMessage({
					chatId: env<number>("TELEGRAM_EN_CHAT_ID"),
					topicId: env<number>("TELEGRAM_EN_TOPIC_REPORTS"),
					message: `${enReportsMessage}`,
				});
			}
		} catch (error) {
			console.error(
				"Error sending message to EN Telegram chat (new project reports)",
				error,
			);
		}

		// Send to Discord
		// try {
		// 	await DiscordService.init().sendProjectNewsMessage(
		// 		newProjectReportsMessageEn(reports),
		// 	);
		// } catch (error) {
		// 	console.error(
		// 		"Error sending message to Discord (new project reports)",
		// 		error,
		// 	);
		// }

		return { sent: reports.length };
	}

	async sendNewSpecialities({ inLastDays = 1 }: { inLastDays?: number }) {
		const lastLog = await prisma.queueJobLog.findFirst({
			where: {
				name: "new-specialities",
				type: prismaClient.QueueJobType.Broker,
				status: prismaClient.QueueJobStatus.Completed,
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		const lastLogDate = lastLog
			? dayjs(lastLog.createdAt).add(1, "second").toDate()
			: dayjs().subtract(inLastDays, "d").toDate();

		const specialities = await prisma.speciality.findMany({
			where: {
				createdAt: { gte: lastLogDate },
				user: { personalDataDeletedAt: null },
			},
			include: { user: { include: { profile: true } } },
		});

		if (specialities.length === 0) return { sent: 0 };

		const ruSpecialities = specialities.filter((s) => s.user.lang === "ru");
		const enSpecialities = specialities.filter((s) => s.user.lang === "en");

		// Send to RU chat
		try {
			if (ruSpecialities.length > 0) {
				const ruSpecialitiesMessage = newSpecialitiesMessageRu(ruSpecialities);

				await this.sendMessage({
					chatId: env<number>("TELEGRAM_CHAT_ID"),
					topicId: env<number>("TELEGRAM_TOPIC_NEWS"),
					message: `${ruSpecialitiesMessage}`,
				});
			}
		} catch (error) {
			console.error(
				"Error sending message to RU Telegram chat (new specialities)",
				error,
			);
		}

		// Send to EN chat
		try {
			if (enSpecialities.length > 0) {
				const enSpecialitiesMessage = newSpecialitiesMessageEn(enSpecialities);

				await this.sendMessage({
					chatId: env<number>("TELEGRAM_EN_CHAT_ID"),
					topicId: env<number>("TELEGRAM_EN_TOPIC_NEWS"),
					message: `${enSpecialitiesMessage}`,
				});
			}
		} catch (error) {
			console.error(
				"Error sending message to EN Telegram chat (new specialities)",
				error,
			);
		}

		// Send to Discord
		// try {
		// 	await DiscordService.init().sendPlatformNewsMessage(
		// 		newSpecialitiesMessageEn(specialities),
		// 	);
		// } catch (error) {
		// 	console.error(
		// 		"Error sending message to Discord (new specialities)",
		// 		error,
		// 	);
		// }

		return { sent: specialities.length };
	}

	async sendNewVacancies({ inLastDays = 1 }: { inLastDays?: number }) {
		const lastLog = await prisma.queueJobLog.findFirst({
			where: {
				name: "new-vacancies",
				type: prismaClient.QueueJobType.Broker,
				status: prismaClient.QueueJobStatus.Completed,
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		const lastLogDate = lastLog
			? dayjs(lastLog.createdAt).add(1, "second").toDate()
			: dayjs().subtract(inLastDays, "d").toDate();

		const projectWithVacancies = await prisma.project.findMany({
			where: {
				author: { personalDataDeletedAt: null },
				team: {
					vacancies: {
						some: {
							status: prismaClient.TeamVacancyStatus.Published,
							publishedAt: { gte: lastLogDate },
						},
					},
				},
				status: prismaClient.ProjectStatus.Approved,
			},
			include: {
				team: {
					include: {
						_count: { select: { vacancies: true } },
						vacancies: true,
						project: { include: { author: { select: { lang: true } } } },
					},
				},
			},
		});

		const projectsWithVacancies = projectWithVacancies.flatMap((project) =>
			project.team && project.team.vacancies.length > 0
				? [{ ...project, team: project.team }]
				: [],
		);

		if (projectsWithVacancies.length === 0) return { sent: 0 };

		const ruVacancies = projectsWithVacancies.filter(
			(v) => v.team.project?.author?.lang === "ru",
		);
		const enVacancies = projectsWithVacancies.filter(
			(v) => v.team.project?.author?.lang === "en",
		);

		// Send to RU chat
		try {
			if (ruVacancies.length > 0) {
				const ruVacanciesMessage = newVacanciesMessageRu(ruVacancies);

				await this.sendMessage({
					chatId: env<number>("TELEGRAM_CHAT_ID"),
					topicId: env<number>("TELEGRAM_TOPIC_VACANCIES"),
					message: `${ruVacanciesMessage}`,
				});
			}
		} catch (error) {
			console.error(
				"Error sending message to RU Telegram chat (new vacancies)",
				error,
			);
		}

		// Send to EN chat
		try {
			if (enVacancies.length > 0) {
				const enVacanciesMessage = newVacanciesMessageEn(enVacancies);

				await this.sendMessage({
					chatId: env<number>("TELEGRAM_EN_CHAT_ID"),
					topicId: env<number>("TELEGRAM_EN_TOPIC_VACANCIES"),
					message: `${enVacanciesMessage}`,
				});
			}
		} catch (error) {
			console.error(
				"Error sending message to RU Telegram chat (new vacancies)",
				error,
			);
		}

		// Send to Discord (English project-news channel)
		try {
			if (process.env.DISCORD_BOT_TOKEN) {
				await DiscordService.init().sendProjectNewsMessage(
					newVacanciesMessageDiscord(projectsWithVacancies),
				);
			}
		} catch (error) {
			console.error("Error sending message to Discord (new vacancies)", error);
		}

		// Send to LinkedIn company page
		try {
			if (LinkedInService.isConfigured()) {
				await LinkedInService.init().sharePost(
					newVacanciesMessageLinkedIn(projectsWithVacancies),
				);
			}
		} catch (error) {
			console.error("Error sending message to LinkedIn (new vacancies)", error);
		}

		return { sent: projectsWithVacancies.length };
	}

	/**
	 * Post a single blog post to the news channel(s). Channels (unlike group
	 * topics) have no threads, so no `message_thread_id` is sent. The bot must be
	 * an admin of the channel with post permission. Channel ids are the numeric
	 * `-100…` form (from getChat / forwarding a channel post to @userinfobot).
	 */
	async sendBlogPost(
		post: Pick<prismaClient.BlogPost, "title" | "content" | "slug" | "image">,
	) {
		const message = blogPostMessageTelegram(post);
		const imageUrl = blogPostOgImage(post);

		const channels: { id?: string; label: string }[] = [
			{ id: process.env.TELEGRAM_NEWS_CHANNEL_ID, label: "RU" },
			{ id: process.env.TELEGRAM_EN_NEWS_CHANNEL_ID, label: "EN" },
		];

		for (const channel of channels) {
			if (!channel.id) continue;
			try {
				// Photo caption is capped at 1024 chars; the blog message stays under.
				// No topicId — channels have no topics. Accepts a numeric -100… id or
				// an @username (passed through by prepareChatId).
				await this.sendPhoto({
					chatId: channel.id,
					url: imageUrl,
					message,
				});
			} catch (photoError) {
				// The photo can fail when Telegram can't fetch the image URL (e.g. a
				// non-public NEXT_PUBLIC_APP_URL like localhost). Fall back to a plain
				// text message so the announcement still goes out.
				console.error(
					`Error sending photo to ${channel.label} Telegram channel (blog post), falling back to text`,
					photoError,
				);
				try {
					await this.sendMessage({ chatId: channel.id, message });
				} catch (textError) {
					console.error(
						`Error sending message to ${channel.label} Telegram channel (blog post)`,
						textError,
					);
				}
			}
		}

		return { ok: true };
	}
}
