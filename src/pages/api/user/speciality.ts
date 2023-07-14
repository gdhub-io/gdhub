import { NextAuthGuard } from '@/lib/api-middlewares'
import { NovuService } from '@/services/novu'
import { prisma } from '@/services/prisma'
import { SearchEngineService } from '@/services/typesense'
import { prepareAirtableData } from '@/services/typesense/commands/migrate'
import { CreateSpecialityDto, DeleteSpecialityDto, UpdateSpecialityDto } from '@/types/dto/speciality'
import { Body, Delete, Get, Post, Put, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

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
			const userNotMember = await prisma.user.findFirst({
				where: { AND: [{ id: req.user.id }, { NOT: { roles: { has: 'Member' } } }] },
			})

			if (userNotMember) {
				await prisma.user.update({
					where: { id: userNotMember.id },
					data: { roles: { push: 'Member' } },
				})

				await NovuService.send({
					template: 'default-message',
					to: {
						subscriberId: userNotMember.id,
						email: userNotMember.email || undefined,
					},
					payload: {
						message: 'Вы добавили специальность и теперь можете откликаться на вакансии с проектов сообщества.',
						url: process.env.NEXT_PUBLIC_APP_URI + '/vacancies',
						linkLabel: 'Смотреть вакансии',
					},
				})
			}
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
