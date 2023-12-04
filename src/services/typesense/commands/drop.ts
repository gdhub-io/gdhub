import { SearchEngineService } from '@/services/typesense'

export async function drop() {
	const searchService = await SearchEngineService.init()
	const existSpecialists = await searchService.existScheme(
		process.env.NEXT_PUBLIC_TYPESENSE_SPECIALISTS_SCHEMA as string
	)

	if (existSpecialists) {
		await searchService.deleteScheme(process.env.NEXT_PUBLIC_TYPESENSE_SPECIALISTS_SCHEMA as string)
		console.info('Specialists sheme was dropped')
	} else {
		console.info('Nothing changes')
	}
}
