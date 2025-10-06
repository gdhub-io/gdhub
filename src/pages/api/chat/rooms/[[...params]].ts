import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { BadRequestException, Body, createHandler, Get, Post, Req } from 'next-api-decorators'

type RoomMember = { userId: string; name: string | null; image: string | null }
type Room = {
	id: string
	members: string[]
	membersInfo: RoomMember[]
	title?: string
	createdAt: string
}

class CreateDirectRoomBody {
	@IsString()
	userId!: string
}

const buildDirectKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`)

@NextAuthGuard('user')
class ChatRoomsHandler {
	@Get()
	async list(@Req() req: NextApiRequestWithUser) {
		const memberships = await prisma.chatRoomMember.findMany({
			where: { userId: req.user.id },
			include: {
				room: {
					include: {
						members: {
							include: {
								user: { select: { id: true, name: true, image: true } },
							},
						},
					},
				},
			},
			orderBy: [{ room: { lastMessageAt: 'desc' } }],
		})

		const rooms: Room[] = memberships.map((m) => ({
			id: m.roomId,
			title: m.room.title || undefined,
			members: m.room.members.map((mm) => mm.userId),
			membersInfo: m.room.members.map((mm) => ({
				userId: mm.userId,
				name: mm.user?.name ?? null,
				image: mm.user?.image ?? null,
			})),
			createdAt: m.room.createdAt.toISOString(),
		}))

		return { rooms }
	}

	@Post('/direct')
	async createDirectRoom(@Req() req: NextApiRequestWithUser, @Body() body: CreateDirectRoomBody) {
		const { userId } = body
		if (!userId) throw new BadRequestException('userId is required')

		const directKey = buildDirectKey(req.user.id, userId)

		// Find or create DIRECT room by directKey
		let room = await prisma.chatRoom.findUnique({ where: { directKey } })

		if (!room) {
			room = await prisma.chatRoom.create({
				data: {
					isDirect: true,
					directKey,
					title: null,
					members: {
						createMany: {
							data: [{ userId: req.user.id }, { userId }],
						},
					},
				},
				include: { members: true },
			})
		} else {
			// Ensure both participants are members
			const existingMembers = await prisma.chatRoomMember.findMany({ where: { roomId: room.id } })
			const needA = !existingMembers.some((m) => m.userId === req.user.id)
			const needB = !existingMembers.some((m) => m.userId === userId)

			if (needA || needB) {
				await prisma.chatRoomMember.createMany({
					data: [
						...(needA ? [{ roomId: room.id, userId: req.user.id }] : []),
						...(needB ? [{ roomId: room.id, userId: userId }] : []),
					],
					skipDuplicates: true,
				})
			}
		}

		const members = await prisma.chatRoomMember.findMany({ where: { roomId: room.id } })

		return {
			room: {
				id: room.id,
				title: room.title || undefined,
				members: members.map((m) => m.userId),
				createdAt: room.createdAt.toISOString(),
			} as Room,
		}
	}
}

export default createHandler(ChatRoomsHandler)
