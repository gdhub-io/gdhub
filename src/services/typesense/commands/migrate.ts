import AirtableService from '@services/airtable'
import { SearchEngineService } from '@services/typesense'
import { specialistsSchema } from '@services/typesense/schemes/specialists'

export async function migrate() {
	try {
		const searchService = await SearchEngineService.init()
		const existSpecialists = await searchService.existScheme('specialists')

		if (!existSpecialists) {
			await searchService.migrateScheme(specialistsSchema)
			console.info('Specialists sheme added')
		}
		console.info('Start')

		await AirtableService('Specialities')
			.select({
				fields: [
					'Name',
					'Specialization',
					'Level',
					'Profile',
					'Direction',
					'Skills',
					'Tools',
					'Workplaces',
					'Schools',
					'Country',
					'City',
				],
			})
			.eachPage(async (specialists: any, next) => {
				try {
					const documents = specialists.map((s: any) => {
						for (const property in s.fields) {
							console.log('key', property)

							if (Array.isArray(s.fields[property]) && s.fields[property][0] == null) {
								s.fields[property] = []
							}

							if (Array.isArray(s.fields[property]) && s.fields[property].length == 1) {
								s.fields[property] = s.fields[property][0]
							}
						}

						return { ...s.fields }
					}) as any[]

					await searchService.client.collections('specialists').documents().import(documents)

					console.info('Added')
				} catch (error: any) {
					console.info(error)
				}

				next()
			})

		console.info('Finish')
	} catch (error: any) {
		console.log(error.importResults())
		console.info('Finish with Error')
	}
}
