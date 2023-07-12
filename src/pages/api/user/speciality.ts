import { Body, Delete, Get, Post, Put, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'
import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { SearchEngineService } from '@/services/typesense'
import { prepareAirtableData } from '@/services/typesense/commands/migrate'
import { CreateSpecialityDto, DeleteSpecialityDto, UpdateSpecialityDto } from '@/types/dto/speciality'

@NextAuthGuard('user')
class ApiSpecialityHandler {
	constructor() {}

	@Get()
	public async get(@Req() req: NextApiRequestWithUser) {
		const speciality = await prisma.speciality.findFirst({
			where: { userId: req.user.id },
			include: { direction: true },
		})

		return speciality
	}

	@Post()
	public async create(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) body: CreateSpecialityDto) {
		const { data } = body

		const speciality = await prisma.speciality.create({
			data: { ...data, userId: req.user.id, tools: data.tools ? data.tools.join(`\n`) : '' } as any,
		})

		const specialitiesCount = await prisma.speciality.count({ where: { userId: req.user.id } })

		if (specialitiesCount == 1) {
			await prisma.user.update({
				where: { id: req.user.id },
				data: { roles: { push: 'Member' } },
			})
		}

		await indexNewDocumentToTypesense(speciality)
	}

	@Put()
	public async update(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) body: UpdateSpecialityDto) {
		const { id, data } = body

		const speciality = await prisma.speciality.update({
			where: { id },
			data: { ...data, tools: data.tools ? data.tools.join(`\n`) : '' } as any,
		})

		const searchClient = await SearchEngineService.init()
		await searchClient.deleteSpecialist(speciality.id)
		await indexNewDocumentToTypesense(speciality)
	}

	@Delete()
	public async delete(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) params: DeleteSpecialityDto) {
		const { id } = params

		await prisma.speciality.delete({ where: { id } })

		const searchClient = await SearchEngineService.init()
		await searchClient.deleteSpecialist(id)
	}
}

export default createHandler(ApiSpecialityHandler)

async function indexNewDocumentToTypesense(speciality: any) {
	const searchClient = await SearchEngineService.init()

	const { id, name, apecialization, level, direction, skills, tools, workplaces, schools, country, city, created } =
		speciality

	/** Create document for typense search engine */
	try {
		await searchClient.addSpecialist(
			prepareAirtableData({
				id,
				fields: {
					name,
					apecialization,
					level,
					direction,
					skills,
					tools,
					workplaces,
					schools,
					country,
					city,
					created,
				},
			})
		)
	} catch (error) {
		console.log(`New record for search engine was not save (id=${speciality.id})`, error)
	}
}
