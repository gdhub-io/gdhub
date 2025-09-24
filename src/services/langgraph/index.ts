import { Client, type DefaultValues, type Thread, type HumanMessage, type Message } from '@langchain/langgraph-sdk'
import { LANGGRAPH_PAGES } from './pages'

const LANGGRAPH_URL = process.env.LANGGRAPH_URL || 'http://localhost:8123'
const LANGGRAPH_GRAPH_ID = process.env.LANGGRAPH_CHAT_GRAPH || 'chat'

export type NormalizedMessage = {
	id?: string
	role: 'human' | 'ai' | 'system' | 'tool' | 'function' | 'remove'
	content: string
}

class LangGraphService {
	private static instance: LangGraphService
	private client: Client
	private defaultAssistantId?: string

	private constructor() {
		this.client = new Client({ apiUrl: LANGGRAPH_URL })
	}

	public static getInstance(): LangGraphService {
		if (!LangGraphService.instance) {
			LangGraphService.instance = new LangGraphService()
		}
		return LangGraphService.instance
	}

	public async getDefaultAssistantId(): Promise<string> {
		if (this.defaultAssistantId) return this.defaultAssistantId

		const envAssistantId = process.env.LANGGRAPH_ASSISTANT_ID || process.env.NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID
		if (envAssistantId) {
			this.defaultAssistantId = envAssistantId
			return this.defaultAssistantId
		}
		// Prefer assistant bound to the desired graph id
		const byGraph = await this.client.assistants.search({ graphId: LANGGRAPH_GRAPH_ID, limit: 1, offset: 0 })
		if (byGraph.length) {
			this.defaultAssistantId = byGraph[0].assistant_id
			return this.defaultAssistantId
		}
		// Fallback: just take the first assistant
		const assistants = await this.client.assistants.search({ limit: 1, offset: 0 })
		if (!assistants.length) throw new Error('No assistants are available on LangGraph server')
		this.defaultAssistantId = assistants[0].assistant_id
		return this.defaultAssistantId
	}

	public async listAssistants(graphId?: string, limit = 20, offset = 0) {
		return this.client.assistants.search({ graphId, limit, offset })
	}

	public async createThread(metadata?: Record<string, unknown>): Promise<Thread<DefaultValues>> {
		const created = await this.client.threads.create({ metadata })
		return created
	}

	public async getThreadState(threadId: string) {
		const state = await this.client.threads.getState(threadId)
		return state
	}

	public normalizeValuesToMessages(values: DefaultValues): NormalizedMessage[] {
		// values can be array of messages or object containing messages
		const raw = Array.isArray(values)
			? values
			: (values as Record<string, unknown>)?.messages && Array.isArray((values as any).messages)
				? ((values as any).messages as Message[])
				: []

		const toText = (msg: any): string => {
			const c = msg?.content
			if (!c) return ''
			if (typeof c === 'string') return c
			if (Array.isArray(c)) {
				return c
					.map((part) =>
						part?.type === 'text'
							? part.text
							: typeof part?.image_url === 'string'
								? part.image_url
								: part?.image_url?.url
					)
					.filter(Boolean)
					.join('\n')
			}
			return ''
		}

		return (raw as Message[]).map((m) => ({ id: (m as any).id, role: m.type, content: toText(m) }))
	}

	public async sendHumanMessageAndWait(threadId: string, text: string, assistantId?: string, route?: string) {
		const targetAssistantId = assistantId || (await this.getDefaultAssistantId())
		const page = LANGGRAPH_PAGES.find((p) => p.path === route)
		const contextMessage = route
			? `Additional information: user is on the page: ${route} - ${page?.title}: ${page?.description}`
			: undefined
		const messages = [
			...(contextMessage ? ([{ type: 'system', content: contextMessage }] as const) : []),
			{ type: 'human', content: text } satisfies HumanMessage,
		]
		const input = { messages }
		const values = await this.client.runs.wait(threadId, targetAssistantId, { input })
		return values
	}
}

export const langGraphService = LangGraphService.getInstance()
