import { ExtendedPrismaClient } from '@/services/prisma'

export const seedSubscriptionPlan = async (prisma: ExtendedPrismaClient) => {
	return prisma.$transaction([
		prisma.subscriptionPlan.createMany({
			data: [{ name: 'EarlyForAuthor', providerPlanName: 'early', price: 5.99 }],
		}),
	])
}
