import { prisma } from '@/services/prisma'
import { SearchEngineService } from '@/services/typesense'
import { specialistsSchema } from '@/services/typesense/schemes/specialists'
import dayjs from 'dayjs'

export async function migrate() {
	try {
		const searchService = await SearchEngineService.init()
		const existSpecialists = await searchService.existScheme(
			process.env.NEXT_PUBLIC_TYPESENSE_SPECIALISTS_SCHEMA as string
		)

		if (!existSpecialists) {
			await searchService.migrateScheme(specialistsSchema)
			console.info('Specialists sheme added')
		}
		console.info('Start')

		const specialists = await prisma.speciality.findMany({
			take: 100,
			orderBy: { id: 'asc' },
			include: { direction: true },
		})

		try {
			const documents = specialists.map((s) =>
				prepareData({ ...s, externalId: s.id, direction: s.direction.name })
			) as any[]
			await searchService.client
				.collections(process.env.NEXT_PUBLIC_TYPESENSE_SPECIALISTS_SCHEMA as string)
				.documents()
				.import(documents)

			console.info('Added')
		} catch (error: any) {
			console.info(error)
		}

		console.info('Finish')
	} catch (error: any) {
		console.log(error.message)
		console.info('Finish with Error')
	}
}

export const prepareData = (record: Record<string, any>) => {
	for (let property in record) {
		let value: string | string[] | number | undefined = record[property]

		if (Array.isArray(value) && value[0] == null) {
			value = undefined
		}

		if (Array.isArray(value) && value.length == 1) {
			value = value[0]
		}

		if (typeof value == 'string' && (property == 'skills' || property == 'jobs' || property == 'schools')) {
			value = value.split('\n')

			if (value[value.length - 1] == '') {
				value.pop()
			}
		}

		if (typeof value == 'string' && property == 'tools') {
			value = value.split(',')

			if (value[value.length - 1] == '') {
				value.pop()
			}
		}

		if (property == 'direction' && !value) {
			value = 'Other'
		}

		if (value instanceof Date && (property == 'createdAt' || property == 'updatedAt')) {
			value = dayjs(value).unix()
			console.log('key', property, value)
		}

		record[property] = value
	}

	return record
}
