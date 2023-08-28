import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { Delete, Post, Query, Req, createHandler } from 'next-api-decorators'

@NextAuthGuard('user')
class ApiLectureListenerHandler {
	constructor() {}

	@Post()
	public async create(@Req() req: NextApiRequestWithUser, @Query() { lectureId }: { lectureId: string }) {
		const lectureListener = await prisma.lectureListener.create({
			data: { lecture: { connect: { id: lectureId } }, listener: { connect: { id: req.user.id } } },
		})

		return lectureListener
	}

	@Delete()
	public async delete(@Req() req: NextApiRequestWithUser, @Query() { lectureId }: { lectureId: string }) {
		await prisma.lectureListener.deleteMany({
			where: { lectureId, listenerId: req.user.id },
		})
	}
}

export default createHandler(ApiLectureListenerHandler)
