import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
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
			data: {
				...data,
				userId: req.user.id,
				tools: data.tools ? data.tools.join(`\n`) : '',
			} as any,
			include: { direction: true },
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

				// await NovuService.send({
				// 	template: 'default-message',
				// 	to: {
				// 		subscriberId: userNotMember.id,
				// 		email: userNotMember.email || undefined,
				// 	},
				// 	payload: {
				// 		message: 'Вы добавили специальность и теперь можете откликаться на вакансии с проектов сообщества.',
				// 		url: process.env.NEXT_PUBLIC_APP_URI + '/vacancies',
				// 		linkLabel: 'Смотреть вакансии',
				// 	},
				// })
			}
		}
	}

	@Put()
	public async updateFirstSpeciality(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) body: UpdateSpecialityDto
	) {
		const {
			id,
			data: { workDirectionId, ...otherData },
		} = body

		const speciality = await prisma.speciality.update({
			where: { id },
			data: {
				...otherData,
				direction: { connect: { id: workDirectionId } },
			} as any,
			include: { direction: true },
		})
	}

	@Delete()
	public async delete(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) params: DeleteSpecialityDto) {
		const { id } = params

		await prisma.speciality.delete({ where: { id } })
	}
}

export default createHandler(ApiSpecialityHandler)
