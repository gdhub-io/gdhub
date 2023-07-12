import { ExtendedPrismaClient } from '@/services/prisma'

export const seedWorkDirections = async (prisma: ExtendedPrismaClient) => {
	return prisma.$transaction([
		prisma.workDirection.deleteMany(),
		prisma.workDirection.createMany({
			data: [
				{ name: 'development' },
				{ name: 'web development' },
				{ name: 'game design' },
				{ name: '2d art & animation' },
				{ name: '3d art & animation' },
				{ name: 'management' },
				{ name: 'game writer' },
				{ name: 'learning' },
				{ name: 'technical art' },
				{ name: 'music & sound' },
				{ name: 'marketing' },
				{ name: 'vfx' },
				{ name: 'qa' },
				{ name: 'hr' },
				{ name: 'video editing' },
				{ name: 'backend development' },
				{ name: 'investment' },
				{ name: 'other' },
			],
		}),
	])
}
