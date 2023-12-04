import { SearchEngineService } from '@/services/typesense'
import { SearchParams } from 'typesense/lib/Typesense/Documents'

export async function search(searchParams: SearchParams) {
	try {
		const searchService = await SearchEngineService.init()

		const response = await searchService.client
			.collections(process.env.NEXT_PUBLIC_TYPESENSE_SPECIALISTS_SCHEMA as string)
			.documents()
			.search(searchParams)

		return response
	} catch (error: any) {
		console.log(error.importResults())
		console.info('Finish with Error')
	}
}
