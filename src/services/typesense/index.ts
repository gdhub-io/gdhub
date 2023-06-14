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
			nodes: [
				{
					host: process.env.NEXT_PUBLIC_TYPESENSE_HOST as string,
					port: Number.parseInt(process.env.NEXT_PUBLIC_TYPESENSE_PORT as string),
					protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL as string,
				},
			],
			apiKey: process.env.TYPESENSE_ADMIN_API as string,
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

	async addSpecialist(document: Record<string, any>) {
		await this.client.collections('specialists').documents().create(document)
	}

	async deleteSpecialist(specialityId: string) {
		return await this.client
			.collections('specialists')
			.documents()
			.delete({ filter_by: `ID:${specialityId}` })
	}
}
