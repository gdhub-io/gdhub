import { Prisma, SubscriptionStatus } from '@prisma/client'
import dayjs from 'dayjs'

export const userPrismaExtension = Prisma.defineExtension((client) => {
	return client.$extends({
		name: 'user-extenstion',
		model: {
			user: {
				existProfile: async (userId: string) => {
					const existProfile = await client.profile.count({ where: { userId } })

					return !!existProfile
				},
				activeSubscription: async (userId: string) => {
					const subscription = await client.subscription.findFirst({
						where: {
							userId,
							status: { equals: SubscriptionStatus.Active },
							startDate: { lt: dayjs().toDate() },
							endDate: { gte: dayjs().toDate() },
						},
						select: { id: true, plan: { select: { id: true, name: true } }, startDate: true, endDate: true },
					})

					return subscription
				},
			},
		},
	})
})
