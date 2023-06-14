import { SearchEngineService } from '@/services/typesense'

export async function drop() {
	const searchService = await SearchEngineService.init()
	const existSpecialists = await searchService.existScheme('specialists')

	if (existSpecialists) {
		await searchService.deleteScheme('specialists')
		console.info('Specialists sheme was dropped')
	} else {
		console.info('Nothing changes')
	}
}
