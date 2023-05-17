import { Client } from 'typesense'
import { CollectionUpdateSchema } from 'typesense/lib/Typesense/Collection'
import { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections'

export class SearchEngineService {
	client: Client

	private constructor(client: Client) {
		this.client = client
	}

	static async init() {
		const client = new Client({
			nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
			apiKey: 'xyz',
			connectionTimeoutSeconds: 2,
		})

		return new SearchEngineService(client)
	}

	async migrateScheme(scheme: CollectionCreateSchema) {
		return await this.client.collections().create(scheme)
	}

	async updateScheme(name: string, newScheme: CollectionUpdateSchema) {
		return await this.client.collections(name).update(newScheme)
	}

	async existScheme(name: string) {
		return await this.client.collections(name).exists()
	}

	async deleteScheme(name: string) {
		return await this.client.collections(name).delete()
	}

	async addMemberIndex(document: Record<string, any>) {
		await this.client.collections('members').documents().create(document)
	}
}
