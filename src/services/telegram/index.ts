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
import { prisma } from "../prisma";
import {
	newProjectReportsMessageEn,
	newProjectReportsMessageRu,
	newSpecialitiesMessageEn,
	newSpecialitiesMessageRu,
	newVacanciesMessageEn,
	newVacanciesMessageRu,
} from "./messages";

export default class TelegramService {
	private apiUrl: string;

	private constructor({ botToken }: { botToken: string }) {
		this.apiUrl = `https://api.telegram.org/bot${botToken}${process.env.NODE_ENV === "development" ? "/test" : ""}`;
	}

	static init(botToken?: string) {
		const defaultBotToken = process.env.TELEGRAM_BOT_TOKEN as string;
		return new TelegramService({ botToken: botToken || defaultBotToken });
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

	async sendMessage({
		chatId,
		topicId,
		message,
		options,
	}: {
		chatId: number;
		topicId?: number;
		message: string;
		options?: Record<string, unknown>;
	}) {
		const text = await parseInline(message);

		const body = {
			chat_id: chatId,
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
		} catch (error: unknown) {
			console.error(error);
		}
	}

	async sendPhoto({
		chatId,
		topicId,
		url,
		message,
	}: {
		chatId: number;
		topicId?: number;
		url: string;
		message?: string;
	}) {
		const body = JSON.stringify({
			chat_id: chatId,
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

			if (!res.ok) throw new Error("Telegram sendMessage response is wrong");

			console.info("Message successfully send.");
		} catch (error: unknown) {
			console.error(error);
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

		// Send to Discord
		// try {
		// 	await DiscordService.init().sendProjectNewsMessage(
		// 		newVacanciesMessageEn(projectWithVacancies),
		// 	);
		// } catch (error) {
		// 	console.error("Error sending message to Discord (new vacancies)", error);
		// }

		return { sent: projectWithVacancies.length };
	}
}
