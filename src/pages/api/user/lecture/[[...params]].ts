import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { Body, Delete, Get, Param, Post, Put, Query, Req, createHandler } from 'next-api-decorators'

@NextAuthGuard('user')
class ApiLectureHandler {
	constructor() {}

	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query() { id }: { id: string }) {
		const lecture = await prisma.lecture.findFirst({
			where: { id },
			include: { listeners: { select: { id: true } } },
		})

		return lecture
	}

	@Get('/:id/show')
	public async show(@Req() req: NextApiRequestWithUser, @Param('id') id: string) {
		const lecture = await prisma.lecture.findFirst({
			where: { id },
			include: { listeners: { select: { id: true } } },
		})

		return lecture
	}

	@Post()
	public async create(@Req() req: NextApiRequestWithUser, @Body() data: any) {
		const { directionId, ...other } = data

		const lecture = await prisma.lecture.create({
			data: {
				...other,
				requestedBy: { connect: { id: req.user.id as string } },
				direction: { connect: { id: directionId } },
				isArchived: false,
			},
		})

		return lecture
	}

	@Put()
	public async update(@Req() req: NextApiRequestWithUser, @Query() { id }: { id: string }, @Body() data: any) {
		await prisma.lecture.update({
			where: { id },
			data,
		})
	}

	@Delete()
	public async delete(@Query() { id }: { id: string }) {
		await prisma.lecture.delete({
			where: { id },
		})
	}
}

export default createHandler(ApiLectureHandler)
