import { drop } from '@/services/typesense/commands/drop'
import { migrate } from '@/services/typesense/commands/migrate'
import { search } from '@/services/typesense/commands/search'
import { SearchEngineService } from '@gdhub-io/gdhub-typesense'
import { Get, Query, createHandler } from 'next-api-decorators'

class ApiSpecialistHandler {
	constructor() {}

	@Get()
	public async get(
		@Query() { task, query }: { task: 'health' | 'migrate' | 'specialists' | 'drop' | 'search'; query: string }
	) {
		const searchClient = await SearchEngineService.init({
			host: process.env.NEXT_PUBLIC_TYPESENSE_HOST as string,
			port: Number.parseInt(process.env.NEXT_PUBLIC_TYPESENSE_PORT as string),
			protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL as string,
			apiKey: process.env.TYPESENSE_ADMIN_API as string,
		})

		switch (task) {
			case 'health':
				const health = await searchClient.client.health.retrieve()
				return health
			case 'migrate':
				await migrate(searchClient)
				break
			case 'specialists':
				const docs = await searchClient.client
					.collections(process.env.NEXT_PUBLIC_TYPESENSE_SPECIALISTS_SCHEMA as string)
					.documents()
					.export()
				return docs
			case 'drop':
				await drop(searchClient)
				break
			case 'search':
				const result = await search(searchClient, {
					q: query,
					query_by: 'name,direction,schools',
				})
				return result
			default:
				throw Error('Unknown task')
		}
	}
}

export default createHandler(ApiSpecialistHandler)
