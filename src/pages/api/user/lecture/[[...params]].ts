import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { LectureStage } from '@prisma/client'
import { Body, Delete, Get, Param, Post, Put, Query, Req, createHandler } from 'next-api-decorators'

@NextAuthGuard('user')
class ApiLectureHandler {
	constructor() {}

	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query() { id }: { id: string }) {
		const lecture = await prisma.lecture.findFirst({
			where: { id },
			include: {
				listeners: { select: { id: true } },
				lecturerRequests: { include: { user: { select: { id: true, name: true, image: true } } } },
			},
		})

		return lecture
	}

	@Get('/:id/show')
	public async show(@Req() req: NextApiRequestWithUser, @Param('id') id: string) {
		const lecture = await prisma.lecture.findFirst({
			where: { id },
			include: {
				listeners: { select: { id: true, lectureId: true } },
				lecturerRequests: { include: { user: { select: { id: true, name: true, image: true } } } },
			},
		})

		return lecture
	}

	@Post('/:id/registration')
	public async registration(@Req() req: NextApiRequestWithUser, @Param('id') id: string) {
		const lectureListener = await prisma.lectureListener.create({
			data: {
				lecture: { connect: { id } },
				listener: { connect: { id: req.user.id } },
			},
		})

		return lectureListener
	}

	@Post()
	public async create(@Req() req: NextApiRequestWithUser, @Body() data: any) {
		const { directionId, lecturerId, ...other } = data

		const lecture = await prisma.lecture.create({
			data: {
				...other,
				requestedBy: other.stage == LectureStage.Requested ? { connect: { id: req.user.id as string } } : undefined,
				lecturer: other.stage == LectureStage.Proposed ? { connect: { id: lecturerId } } : undefined,
				direction: { connect: { id: directionId } },
				isArchived: false,
				wishes: other.wishes || undefined,
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

	@Post('/:id/lecturer')
	public async createLecturerRequest(@Req() req: NextApiRequestWithUser, @Body() data: any) {
		const { lectureId, ...other } = data

		const lecture = await prisma.lecturerRequest.create({
			data: {
				user: { connect: { id: req.user.id } },
				lecture: { connect: { id: lectureId } },
				...other,
			},
		})

		return lecture
	}

	@Put('/:id/lecturer/:requestId')
	public async updateLecturerRequest(
		@Req() req: NextApiRequestWithUser,
		@Body() data: any,
		@Param('requestId') requestId: string
	) {
		const lecture = await prisma.lecturerRequest.update({
			where: { id: requestId },
			data,
		})

		return lecture
	}

	@Delete('/:lectureId/lecturer/:requestId')
	public async deleteLecturerRequest(@Param('requestId') requestId: string, @Param('lectureId') lectureId: string) {
		await prisma.lecturerRequest.delete({
			where: { id: requestId, lectureId },
		})
	}
}

export default createHandler(ApiLectureHandler)
