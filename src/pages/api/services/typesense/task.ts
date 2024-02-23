import { SearchEngineService } from '@/services/typesense'
import { drop } from '@/services/typesense/commands/drop'
import { migrate } from '@/services/typesense/commands/migrate'
import { search } from '@/services/typesense/commands/search'
import { Get, Query, createHandler } from 'next-api-decorators'

// @NextAuthGuard('api')
class ApiSpecialistHandler {
	constructor() {}

	@Get()
	public async get(
		@Query() { task, query }: { task: 'health' | 'migrate' | 'specialists' | 'drop' | 'search'; query: string }
	) {
		const searchClient = await SearchEngineService.init()

		switch (task) {
			case 'health':
				const health = await searchClient.client.health.retrieve()
				return health
			case 'migrate':
				await migrate()
				break
			case 'specialists':
				const docs = await searchClient.client
					.collections(process.env.NEXT_PUBLIC_TYPESENSE_SPECIALISTS_SCHEMA as string)
					.documents()
					.export()
				return docs
			case 'drop':
				await drop()
				break
			case 'search':
				const result = await search({
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
