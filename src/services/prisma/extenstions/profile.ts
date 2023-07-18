import { Prisma } from '@prisma/client'
import dayjs from 'dayjs'

export const profilePrismaExtenstion = Prisma.defineExtension((client) => {
	return client.$extends({
		name: 'profile-extenstion',
		result: {
			profile: {
				createdAt: {
					needs: { createdAt: true },
					compute: (model) => dayjs(model.createdAt).toISOString(),
				},
				updatedAt: {
					needs: { updatedAt: true },
					compute: (model) => dayjs(model.updatedAt).toISOString(),
				},
			},
		},
	})
})
