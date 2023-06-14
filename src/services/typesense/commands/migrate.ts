import dayjs from 'dayjs'
import AirtableService from '@/services/airtable'
import { SearchEngineService } from '@/services/typesense'
import { specialistsSchema } from '@/services/typesense/schemes/specialists'

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
					'Created',
				],
			})
			.eachPage(async (specialists: any, next) => {
				try {
					const documents = specialists.map((s: any) => prepareAirtableData(s)) as any[]

					await searchService.client.collections('specialists').documents().import(documents)

					console.info('Added')
				} catch (error: any) {
					console.info(error)
				}

				next()
			})

		console.info('Finish')
	} catch (error: any) {
		console.log(error.message)
		console.info('Finish with Error')
	}
}

export const prepareAirtableData = (airtableRecord: Record<string, any>) => {
	for (let property in airtableRecord.fields) {
		let value: string | string[] | number | undefined = airtableRecord.fields[property]

		if (Array.isArray(value) && value[0] == null) {
			value = undefined
		}

		if (Array.isArray(value) && value.length == 1) {
			value = value[0]
		}

		if (typeof value == 'string' && (property == 'Skills' || property == 'Workplaces' || property == 'Schools')) {
			value = value.split('\n')

			if (value[value.length - 1] == '') {
				value.pop()
			}
		}

		if (typeof value == 'string' && property == 'Tools') {
			value = value.split(',')

			if (value[value.length - 1] == '') {
				value.pop()
			}
		}

		if (property == 'Direction' && !value) {
			value = 'Other'
		}

		if (typeof value == 'string' && property == 'Created') {
			value = dayjs(value).unix()
			console.log('key', property, value)
		}

		airtableRecord.fields[property] = value
	}

	return { ...airtableRecord.fields, ID: airtableRecord.id }
}
