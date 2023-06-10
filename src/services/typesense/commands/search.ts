import AirtableService from '@services/airtable'
import { SearchEngineService } from '@services/typesense'
import { specialistsSchema } from '@services/typesense/schemes/specialists'
import { SearchParams } from 'typesense/lib/Typesense/Documents'

export async function search(searchParams: SearchParams) {
	try {
		const searchService = await SearchEngineService.init()

		const response = await searchService.client.collections('specialists').documents().search(searchParams)

		return response
	} catch (error: any) {
		console.log(error.importResults())
		console.info('Finish with Error')
	}
}
