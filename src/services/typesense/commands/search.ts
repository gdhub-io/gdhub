import { SearchEngineService } from '@gdhub-io/gdhub-typesense'
import { SearchParams } from '@gdhub-io/gdhub-typesense/dist/types'

export async function search(searchClient: SearchEngineService, searchParams: SearchParams) {
	try {
		const response = await searchClient.client
			.collections(process.env.NEXT_PUBLIC_TYPESENSE_SPECIALISTS_SCHEMA as string)
			.documents()
			.search(searchParams)

		return response
	} catch (error: any) {
		console.log(error.importResults())
		console.info('Finish with Error')
	}
}
