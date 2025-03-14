/**
 * Docs page https://telegram-bot-sdk.readme.io/reference/sendmessage
 * Telegram Bot API Docs https://core.telegram.org/bots/api#formatting-options
 */

import { AvailableLocales } from '@/config/locale'
import { env } from '@/helpers/env'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import axios from 'axios'
import dayjs from 'dayjs'
import { parseInline } from 'marked'
import fetch from 'node-fetch'
import {
	newProjectReportsMessageEn,
	newProjectReportsMessageRu,
	newSpecialitiesMessageEn,
	newSpecialitiesMessageRu,
	newVacanciesMessageEn,
	newVacanciesMessageRu,
} from './messages'
import { prisma } from '../prisma'

export default class TelegramService {
	private apiUrl: string

	private constructor({ botToken }: any) {
		this.apiUrl = `https://api.telegram.org/bot${botToken}${process.env.NODE_ENV == 'development' ? '/test' : ''}`
	}

	static init(botToken?: string) {
		const defaultBotToken = process.env.TELEGRAM_BOT_TOKEN as string
		return new TelegramService({ botToken: botToken || defaultBotToken })
	}

	async health() {
		try {
			const res = await axios.post(`${this.apiUrl}/getMe`)

			if (!res.data) {
				console.error('Telegram getMe response is wrong')
				return { ok: false }
			}

			console.log(res)

			return { ok: res.status == 200 }
		} catch (error: any) {
			console.log(error)
			return { ok: false }
		}
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
		locale = AvailableLocales.ru,
	}: {
		inLastDays?: number
		locale?: AvailableLocales
	}) {
		const lastLog = await prisma.queueJobLog.findFirst({
			where: {
				name: 'new-project-reports',
				type: prismaClient.QueueJobType.Broker,
				status: prismaClient.QueueJobStatus.Completed,
			},
			orderBy: {
				createdAt: 'desc',
			},
		})

		const lastLogDate = lastLog
			? dayjs(lastLog.createdAt).add(1, 'second').toDate()
			: dayjs().subtract(inLastDays, 'd').toDate()

		const reports = await prisma.projectReport.findMany({
			where: {
				publishedAt: { gte: lastLogDate },
				project: { status: prismaClient.ProjectStatus.Approved },
			},
			include: { project: { select: { name: true, slug: true } } },
		})

		if (reports.length == 0) return { sent: 0 }

		let message = ''

		switch (locale) {
			case 'ru':
				message = newProjectReportsMessageRu(reports)
				break
			case 'en':
				message = newProjectReportsMessageEn(reports)
				break
		}

		await this.sendMessage({
			chatId: env<number>('TELEGRAM_CHAT_ID'),
			topicId: env<number>('TELEGRAM_TOPIC_REPORTS'),
			message,
		})

		return { sent: reports.length }
	}

	async sendNewSpecialities({
		inLastDays = 1,
		locale = AvailableLocales.ru,
	}: {
		inLastDays?: number
		locale?: AvailableLocales
	}) {
		const lastLog = await prisma.queueJobLog.findFirst({
			where: {
				name: 'new-specialities',
				type: prismaClient.QueueJobType.Broker,
				status: prismaClient.QueueJobStatus.Completed,
			},
			orderBy: {
				createdAt: 'desc',
			},
		})

		const lastLogDate = lastLog
			? dayjs(lastLog.createdAt).add(1, 'second').toDate()
			: dayjs().subtract(inLastDays, 'd').toDate()

		const specialities = await prisma.speciality.findMany({
			where: {
				createdAt: { gte: lastLogDate },
			},
			include: { user: { include: { profile: true } } },
		})

		if (specialities.length == 0) return { sent: 0 }

		let message = ''

		switch (locale) {
			case 'ru':
				message = newSpecialitiesMessageRu(specialities)
				break
			case 'en':
				message = newSpecialitiesMessageEn(specialities)
				break
		}

		await this.sendMessage({
			chatId: env<number>('TELEGRAM_CHAT_ID'),
			topicId: env<number>('TELEGRAM_TOPIC_NEWS'),
			message,
		})

		return { sent: specialities.length }
	}

	async sendNewVacancies({
		inLastDays = 1,
		locale = AvailableLocales.ru,
	}: {
		inLastDays?: number
		locale?: AvailableLocales
	}) {
		const lastLog = await prisma.queueJobLog.findFirst({
			where: {
				name: 'new-vacancies',
				type: prismaClient.QueueJobType.Broker,
				status: prismaClient.QueueJobStatus.Completed,
			},
			orderBy: {
				createdAt: 'desc',
			},
		})

		const lastLogDate = lastLog
			? dayjs(lastLog.createdAt).add(1, 'second').toDate()
			: dayjs().subtract(inLastDays, 'd').toDate()

		let projectWithVacancies = await prisma.project.findMany({
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
			include: { team: { select: { _count: { select: { vacancies: true } }, vacancies: true } } },
		})

		projectWithVacancies = projectWithVacancies.filter((r: any) => r.team.vacancies.length > 0)

		if (projectWithVacancies.length == 0) return { sent: 0 }

		let message = ''

		switch (locale) {
			case 'ru':
				message = newVacanciesMessageRu(projectWithVacancies)
				break
			case 'en':
				message = newVacanciesMessageEn(projectWithVacancies)
				break
		}

		await this.sendMessage({
			chatId: env<number>('TELEGRAM_CHAT_ID'),
			topicId: env<number>('TELEGRAM_TOPIC_VACANCIES'),
			message,
		})

		return { sent: projectWithVacancies.length }
	}
}
