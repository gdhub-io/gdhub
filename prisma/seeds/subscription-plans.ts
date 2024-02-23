import { ExtendedPrismaClient } from '@/services/prisma'

export const seedSubscriptionPlan = async (prisma: ExtendedPrismaClient) => {
	return prisma.$transaction([
		prisma.subscriptionPlan.createMany({
			data: [
				{ name: 'EarlyForAuthor', price: 10 },
				{ name: 'EarlyForSpecialist', price: 5 },
			],
		}),
	])
}
