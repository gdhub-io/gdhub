import { env } from '@/helpers/env'
import { isValidJSON } from '@/helpers/format'
import { stripIndents } from 'common-tags'
import { OpenAI as OpenAIAPI } from 'openai'
import { prisma } from '../prisma'

class OpenAI {
	private static instance: OpenAI
	openai: OpenAIAPI

	private constructor() {
		this.openai = new OpenAIAPI({
			apiKey: env('OPENAI_API_KEY'),
			organization: env('OPENAI_API_CLIENT_ID'),
		})
	}

	static getInstance() {
		if (!OpenAI.instance) {
			OpenAI.instance = new OpenAI()
		}

		return OpenAI.instance
	}

	async createEmbedding(document: string) {
		try {
			const clearContent = document.replace(/\n/g, ' ')
			const moderation = await this.moderationInput(clearContent)

			if (moderation) throw Error('There are flagged content')

			const embeddingResponse = await this.openai.embeddings.create({
				model: 'text-embedding-ada-002',
				input: clearContent,
			})

			const [{ embedding }] = embeddingResponse.data

			return embedding
		} catch (error) {
			throw error
		}
	}

	async moderationInput(input: string) {
		try {
			const moderationResponse = await this.openai.moderations.create({
				input,
			})

			const [results] = moderationResponse.results

			if (results.flagged) {
				return {
					error: 'Flagged content',
					flagged: true,
					categories: results.categories,
				}
			}

			return
		} catch (error) {
			throw error
		}
	}

	async parseCV(text: string, jobPosition: string, options?: { locale: string }) {
		const workDirections = await prisma.workDirection.findMany({ select: { id: true, name: true } })

		const schema = {
			type: 'object',
			properties: {
				summary: { type: 'string' },
				specialization: { type: 'string' },
				workAreaId: {
					type: 'string',
					enum: workDirections.map((wd) => wd.id),
					default: workDirections.find((wd) => wd.name == 'other')?.id,
				},
				skills: {
					type: 'array',
					items: {
						type: 'string',
					},
				},
				experience: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							roleName: { type: 'string' },
							companyName: { type: 'string', description: 'company name' },
							location: { type: ['string', 'null'] },
							from: { type: 'string', description: 'employment date in ISO8601 format' },
							to: { type: ['string', 'null'], description: 'date of dismissal in ISO8601 format or null' },
							description: { type: 'string' },
						},
					},
				},
				education: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							speciality: { type: ['string', 'null'] },
							degree: { type: ['string', 'null'] },
							school: { type: 'string' },
							location: { type: ['string', 'null'] },
							from: { type: 'string', description: 'receipt date in ISO8601' },
							to: { type: ['string', 'null'], description: 'graduation date in ISO8601 or null' },
							description: { type: 'string' },
						},
					},
				},
				portfolioLink: { type: 'string' },
				tools: {
					type: 'array',
					items: {
						type: 'string',
					},
				},
			},
		}

		const prompt: OpenAIAPI.Chat.Completions.ChatCompletionMessageParam[] = [
			{
				role: 'system',
				content: stripIndents`
				You are a specialist who shares information about your resume/CV. A text of your resume demarcated by triple quotation marks.
        Find information only about a specified role "${jobPosition}".
        Strongly use "${options?.locale || 'en'}" language for an answer.
				`,
			},
			{
				role: 'user',
				content: stripIndents`
				Parse this resume to json given the following steps:
				2. Find a summery of the resume.
				3. Find information about a person's experience. If an entry doesn't have a finish date data then use "now" for the field.
        4. Find information about a person's education (schools, colledges, universities, courses, etc).
        5. Find information about the tools (frameworks, programming languages, software, etc.) that a person uses.
        7. Determine which area of activity the specified position belongs to and return "id" of the area.
        8. Determine what the person specializes in him work position ${jobPosition}.
        9. Define a list of job skills related to the specified job ${jobPosition} in the format "verb" + "noun" + "object". Examples: develop mobile applications for accounting, draw illustrations for books, write scripts for game dialogues, make mobile games)
        10. Find a link to your portfolio/resume if available.

        Areas of activity data:\n
        ${workDirections.map((wd) => `id=${wd.id} name=${wd.name}\n`)}
				
        Resume text:\n
				"""${text}"""
				`,
			},
		]

		console.debug(`[parseCV][prompt]`, JSON.stringify(prompt))

		try {
			const completionResponse = await this.openai.chat.completions.create({
				model: 'gpt-4o',
				functions: [{ name: 'parse_resume', parameters: schema }],
				function_call: { name: 'parse_resume' },
				messages: prompt,
				temperature: 0.25,
			})

			const {
				choices: [{ message }],
			} = completionResponse

			console.debug(`[parseCV][result]`, message?.function_call?.arguments)

			return isValidJSON(message?.function_call?.arguments)
				? JSON.parse(message?.function_call?.arguments as string)
				: undefined
		} catch (error: any) {
			console.error(error.message)
			throw error
		}
	}

	async matchingSpecAndProj(specialistText: string, projectText: string) {
		const schema = {
			type: 'object',
			properties: {
				projectScore: {
					type: 'number',
					description: 'percentage between 0 and 100 of specialist compliance with the project',
					minimum: 0,
					maximum: 100,
				},
				authorScore: {
					type: 'number',
					description: 'percentage between 0 and 100 of specialist compliance with the author of the project',
					minimum: 0,
					maximum: 100,
				},
				teamScore: {
					type: 'number',
					description: 'percentage between 0 and 100 of specialist compliance with the team of the project',
					minimum: 0,
					maximum: 100,
				},
				summary: {
					type: 'string',
					description: 'Comparison result. How is this specialist suitable or not suitable for this project and why',
				},
			},
		}

		const prompt: OpenAIAPI.Chat.Completions.ChatCompletionMessageParam[] = [
			{
				role: 'system',
				content: stripIndents`
				You are an experienced recruiter for game development teams and know how to select the composition of teams well, with minimal risks of conflicts within them. 
				Possess all modern skills in the field of Human Resources.
				`,
			},
			{
				role: 'user',
				content: stripIndents`
				You need to determine whether the presented specialist is suitable to work in a team on an indie game project, as well as to promote, management and sell it on the market.
				1. Determine the percentage of specialist compliance with the project.
				2. Determine the percentage of correspondence between the specialist and the author of the project.
        3. Determine the percentage of compliance of a specialist to the project team.
				4. Comparison result. How is this specialist suitable or not suitable for this project and why.

				Important! Do not include people's names and personal data of the people in the comparison result.

        Information about the specialist:\n
        ${specialistText}
				
				Information about the project:\n
				"""${projectText}"""
				`,
			},
		]

		// console.debug(`[matchingSpecAndProj][prompt]`, JSON.stringify(prompt))

		try {
			const completionResponse = await this.openai.chat.completions.create({
				model: 'gpt-4o',
				functions: [{ name: 'parse_resume', parameters: schema }],
				function_call: { name: 'parse_resume' },
				messages: prompt,
				temperature: 0.25,
			})

			const {
				choices: [{ message }],
			} = completionResponse

			// console.debug(`[matchingSpecAndProj][result]`, message?.function_call?.arguments)

			return isValidJSON(message?.function_call?.arguments)
				? JSON.parse(message?.function_call?.arguments as string)
				: undefined
		} catch (error: any) {
			console.error(error.message)
			throw error
		}
	}
}

const globalForOpenAI = globalThis as unknown as {
	openAI: OpenAI | undefined
}

export const openAI = globalForOpenAI.openAI ?? OpenAI.getInstance()

// if (env('NODE_ENV') !== 'production') globalForOpenAI.openAI = openAI
