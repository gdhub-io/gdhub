import { env } from '@helpers/env'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v10'

export interface DiscordUser {
	id: number
	username: string
	avatar: string
	email: string
	discriminator: string
	public_flags: number
	flags: number
	locale: string
	mfa_enabled: boolean
	premium_type: number
}

const discordBot = new REST({ version: '10' }).setToken(env('DISCORD_BOT_TOKEN'))

export default class DiscordService {
	static config = {
		cookieName: env('NEXT_PUBLIC_AUTH_COOKIE_NAME'),
		clientId: env('DISCORD_CLIENT_ID'),
		clientSecret: env('DISCORD_CLIENT_SECRET'),
		appUri: env('NEXT_PUBLIC_APP_URI', 'http://localhost:3000', true),
		oauthUri: env('NEXT_PUBLIC_DISCORD_AUTH_URL'),
		jwtSecret: env('JWT_SECRET', 'this is a development value that should be changed in production!!!!!', true),
		scope: ['identify', 'email', 'guilds.join'].join(' '),
	}

	static async getToken(code: string, state?: any) {
		const data: any = {
			client_id: this.config.clientId,
			client_secret: this.config.clientSecret,
			grant_type: 'authorization_code',
			redirect_uri: `${this.config.appUri}/api/oauth/discord`,
			code,
			scope: this.config.scope,
		}

		// decode state
		let stateObject: { redirectTo: string; courseId: string } | null = null
		if (state) {
			let buff = Buffer.from(state as string, 'base64')
			stateObject = JSON.parse(buff.toString('utf8'))
		}

		const response: any = await fetch('https://discord.com/api/oauth2/token', {
			method: 'post',
			body: new URLSearchParams(data).toString(),
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		})

		const { access_token = null, token_type = 'Bearer' } = await response.json()

		return {
			access_token,
			token_type,
			redirectTo: stateObject?.redirectTo ? stateObject.redirectTo : '/',
			courseId: stateObject?.courseId ? stateObject.courseId : '',
		}
	}

	static async getAuthorizedUser(access_token: string): Promise<any> {
		try {
			const response: any = await fetch('https://discord.com/api/users/@me', {
				headers: { Authorization: `Bearer ${access_token}` },
			})

			const discordUser: DiscordUser & { unauthorized: true } = await response.json()

			return discordUser
		} catch (error) {
			console.error(error)
			return null
		}
	}

	static async addUserToGuild(access_token: string, userId: string, roles?: string[]): Promise<any> {
		return await discordBot.put(Routes.guildMember(env('NEXT_PUBLIC_DISCORD_GUILD_ID'), userId), {
			body: {
				access_token,
				roles,
			},
		})
	}

	static async addThread(data: any, messageId: string, channelId: string): Promise<any> {
		return await discordBot.post(Routes.threads(channelId, messageId), {
			body: data,
		})
	}

	static async addMemberRole(userId: string, roleId: string): Promise<any> {
		try {
			return await discordBot.put(Routes.guildMemberRole(env('NEXT_PUBLIC_DISCORD_GUILD_ID'), userId, roleId))
		} catch (error) {
			console.error(error)
			return null
		}
	}

	static async getMember(userId: string): Promise<any> {
		try {
			return await discordBot.get(Routes.guildMember(env('NEXT_PUBLIC_DISCORD_GUILD_ID'), userId))
		} catch (error) {
			console.error(error)
			return null
		}
	}

	static async sendMessage(channelId: string, content: any): Promise<any> {
		try {
			return await discordBot.post(Routes.channelMessages(channelId), {
				body: {
					content,
				},
			})
		} catch (error) {
			console.error(error)
			return null
		}
	}

	static async sendDirectMessage(userId: string, content: any): Promise<any> {
		try {
			const userChannel: any = await discordBot.post(Routes.userChannels(), { body: { recipient_id: userId } })

			await discordBot.post(Routes.channelMessages(userChannel.id), {
				body: content,
			})
		} catch (error) {
			console.error(error)
			return null
		}
	}
}
