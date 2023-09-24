import { Prisma } from '@prisma/client'

export const healthExtension = Prisma.defineExtension((client) => {
	return client.$extends({
		name: 'health-extenstion',
		client: {
			async $isHealthy() {
				try {
					const result = await client.$queryRaw`SELECT 1`
					console.log(result)

					return true
				} catch (e) {
					return false
				}
			},
		},
	})
})
