/**
 * Docs page https://telegram-bot-sdk.readme.io/reference/sendmessage
 * Telegram Bot API Docs https://core.telegram.org/bots/api#formatting-options
 */

import { AvailableLocales } from '@/config/locale'
import { env } from '@/helpers/env'
import { ProjectStatus, TeamVacancyStatus } from '@prisma/client'
import axios from 'axios'
import { stripIndents } from 'common-tags'
import dayjs from 'dayjs'
import localeData from 'dayjs/plugin/localeData'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import weekday from 'dayjs/plugin/weekday'
import { parseInline } from 'marked'
import fetch from 'node-fetch'
import { prisma } from './prisma'

dayjs.extend(localizedFormat)
dayjs.extend(localeData)
dayjs.extend(relativeTime)
dayjs.extend(weekday)
dayjs.locale((process.env.NEXT_PUBLIC_APP_DEFAULT_LOCALE as string) || 'en')

const newProjectReportsMessageRu = (reports: any[]) => {
	let message = '<b>Новое на проектах сообщества</b>'

	reports.map((report) => {
		message += `\n\n<b>Проект ${report.project.name}</b> / ${report.project.stage.season.name}\n`
		message += '<i>Отчет от: ' + dayjs(report.publishedAt).format('ll') + '</i>\n\n'
		message += '- ' + report.content
		message += report.video
			? `\n<a href="${'https://www.youtube.com/watch?v=' + report.video}">Прикрепленное видео</a>`
			: ''
		message += `\n<a href="https://gdhub.io/project/${report.project.slug}">Читать дальше</a>`
	})

	message += '\n<i>p.s. Полный текст отчетов смотрите на страницах проектов.</i>'

	return message
}

const newProjectReportsMessageEn = (reports: any[]) => {
	let message = '<b>New on games projects</b>'

	reports.map((report) => {
		message += `\n\n<b>Project ${report.project.name}</b> / ${report.project.stage.season.name}\n`
		message += '<i>Report from: ' + dayjs(report.publishedAt).format('ll') + '</i>\n\n'
		message += '- ' + report.content
		message += report.video ? `\n<a href="${'https://www.youtube.com/watch?v=' + report.video}">Attached video</a>` : ''
		message += `\n<a href="https://gdhub.io/project/${report.project.slug}">Read more</a>`
	})

	message += '\n<i>p.s. See the full text of the reports on the project pages.</i>'

	return message
}

const newSpecialitiesMessageRu = (specialities: any[]) => {
	let message = `<b>Новые участники сообщества</b>\n\nК сообществу присоединилось <b>+${specialities.length} участника</b> имеющие такие специальности, как:\n- `
	message += specialities.map((r) => r.name).join(';\n- ')
	message += '\n\nДобро пожаловать в наш хаб!'

	return message
}

const newSpecialitiesMessageEn = (specialities: any[]) => {
	let message = `<b>New </b>\n\n<b>+${specialities.length} members</b> have joined the community with specialties such as:\n- `
	message += specialities.map((r) => r.name).join(';\n- ')
	message += '\n\nWelcome to our hub!'

	return message
}

const newVacanciesMessageRu = (projectWithVacancies: any[]) => {
	let message = '🔥 <b>Новые вакансии на проекты сообщества</b>'

	projectWithVacancies.map((project) => {
		const vacancyNames = project.vacancies.map((v: any) => v.title)

		message += `\n\n<b><a href="https://gdhub.io/project/${project.slug}">Проект ${project.name}</a></b>\n`
		message += '- ' + vacancyNames.join('\n- ')
	})

	message +=
		'\n\n<i>p.s. Откликнуться на вакансию можно на странице проекта. Для этого необходимо кликнуть на его название.</i>'

	return message
}

const newVacanciesMessageEn = (projectWithVacancies: any[]) => {
	let message = '🔥 <b>New vacancies for community projects</b>'

	projectWithVacancies.map((project) => {
		const vacancyNames = project.vacancies.map((v: any) => v.title)

		message += `\n\n<b><a href="https://gdhub.io/project/${project.slug}">Project ${project.name}</a></b>\n`
		message += '- ' + vacancyNames.join('\n- ')
	})

	message += '\n\n<i>p.s. You can apply for a vacancy on the project page. To do this, click on its name.</i>'

	return message
}

const newConsulationRequestMessage = ({ topic, comment }: { topic: string; comment: string }) => {
	return {
		message: stripIndents`
			<b>Новый запрос на консультацию</b>
	
			Тема: ${topic ? topic : '-'}
			Комментарий: ${!comment ? '-' : ''}
			<blockquote>${comment}</blockquote>
			`,
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: 'Принять запрос',
						callback_data: 'accept_request',
					},
					{
						text: 'Отклонить запрос',
						callback_data: 'decline_request',
					},
					{
						text: 'Детали',
						web_app: {
							url: `${process.env.TELEGRAM_TMA_URL}/?startup=req${12345}&mode=compact`,
						},
					},
				],
			],
		},
	}
}

export default class TelegramService {
	private apiUrl: string

	private constructor({ botToken }: any) {
		this.apiUrl = `https://api.telegram.org/bot${botToken}`
	}

	static init(botToken?: string) {
		const defaultBotToken = process.env.TELEGRAM_BOT_TOKEN as string
		return new TelegramService({ botToken: botToken || defaultBotToken })
	}

	async sendMessage({
		chatId,
		topicId,
		message,
		options,
	}: {
		chatId: number
		topicId?: number
		message: string
		options?: Record<string, any>
	}) {
		const text = await parseInline(message)

		let body: Record<string, any> = {
			chat_id: chatId,
			message_thread_id: topicId || undefined,
			parse_mode: 'HTML',
			disable_notification: process.env.TELEGRAM_DISABLE_NOTIFICATIONS == '1',
			text: text.replace(/<img[^>]*>/g, ''), //1-4096 characters
		}

		if (options) {
			body.reply_markup = options
		}

		try {
			const res = await axios.post(`${this.apiUrl}/sendMessage`, body)

			if (!res.data) throw new Error('Telegram sendMessage response is wrong')

			console.log('Message successfully send.')
		} catch (error: any) {
			console.log(error)
		}
	}

	async sendPhoto({
		chatId,
		topicId,
		url,
		message,
	}: {
		chatId: number
		topicId?: number
		url: string
		message?: string
	}) {
		const body = JSON.stringify({
			chat_id: chatId,
			message_thread_id: topicId || undefined,
			photo: url,
			caption: message, //0-1024 characters
			parse_mode: 'HTML',
			disable_notification: process.env.TELEGRAM_DISABLE_NOTIFICATIONS == '1',
		})

		try {
			const res = await fetch(`${this.apiUrl}/sendPhoto`, {
				method: 'post',
				body: body,
				headers: {
					accept: 'application/json',
					'content-type': 'application/json',
				},
			})

			if (!res.ok) throw new Error('Telegram sendMessage response is wrong')

			console.log('Message successfully send.')
		} catch (error: any) {
			console.log(error)
		}
	}

	async sendNewProjectReports({
		inLastDays = 1,
		locale = AvailableLocales.en,
	}: {
		inLastDays?: number
		locale?: AvailableLocales
	}) {
		const reports = await prisma.projectReport.findMany({
			where: {
				publishedAt: { gte: dayjs().subtract(inLastDays, 'd').toDate() },
				project: { status: ProjectStatus.Approved },
			},
			include: { project: { include: { stage: { include: { season: true } } } } },
		})

		if (reports.length == 0) return

		let message = ''

		switch (locale) {
			case 'ru':
				message = newProjectReportsMessageRu(reports)
			case 'en':
				message = newProjectReportsMessageEn(reports)
		}

		await this.sendMessage({
			chatId: env<number>('TELEGRAM_CHAT_ID'),
			topicId: env<number>('TELEGRAM_TOPIC_REPORTS'),
			message,
		})
	}

	async sendNewSpecialities({
		inLastDays = 1,
		locale = AvailableLocales.en,
	}: {
		inLastDays?: number
		locale?: AvailableLocales
	}) {
		const specialities = await prisma.speciality.findMany({
			where: {
				createdAt: { gte: dayjs().subtract(inLastDays, 'd').toDate() },
			},
			include: { user: { include: { profile: true } } },
		})

		if (specialities.length == 0) return

		let message = ''

		switch (locale) {
			case 'ru':
				message = newSpecialitiesMessageRu(specialities)
			case 'en':
				message = newSpecialitiesMessageEn(specialities)
		}

		await this.sendMessage({
			chatId: env<number>('TELEGRAM_CHAT_ID'),
			topicId: env<number>('TELEGRAM_TOPIC_NEWS'),
			message,
		})
	}

	async sendNewVacancies({
		inLastDays = 1,
		locale = AvailableLocales.en,
	}: {
		inLastDays?: number
		locale?: AvailableLocales
	}) {
		let projectWithVacancies = await prisma.project.findMany({
			where: {
				team: {
					vacancies: {
						every: {
							status: TeamVacancyStatus.Published,
							publishedAt: { gte: dayjs().subtract(inLastDays, 'days').toDate() },
						},
					},
				},
				status: ProjectStatus.Approved,
			},
			include: { team: { select: { _count: { select: { vacancies: true } } } } },
		})

		projectWithVacancies = projectWithVacancies.filter((r) => r.team._count.vacancies > 0)

		if (projectWithVacancies.length == 0) return

		let message = ''

		switch (locale) {
			case 'ru':
				message = newVacanciesMessageRu(projectWithVacancies)
			case 'en':
				message = newVacanciesMessageEn(projectWithVacancies)
		}

		await this.sendMessage({
			chatId: env<number>('TELEGRAM_CHAT_ID'),
			topicId: env<number>('TELEGRAM_TOPIC_VACANCIES'),
			message,
		})
	}

	async sendConsultationRequest({ chatId, topic, comment }: { chatId: string; topic: string; comment: string }) {
		const message = newConsulationRequestMessage({ topic, comment })

		await this.sendMessage({
			chatId: +chatId,
			message: message.message,
			options: message.reply_markup,
		})
	}
}
