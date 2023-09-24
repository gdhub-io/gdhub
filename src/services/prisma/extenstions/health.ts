import { Prisma } from '@prisma/client'

export const healthExtension = Prisma.defineExtension((client) => {
	return client.$extends({
		name: 'health-extenstion',
		client: {
			async $isHealthy() {
				try {
					await client.$queryRaw`SELECT 1`
					return true
				} catch (e) {
					return false
				}
			},
		},
	})
})
