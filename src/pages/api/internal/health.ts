// import { prisma } from '@/services/prisma'
// import { Get, createHandler } from 'next-api-decorators'

// class ApiTemplateEndpointHandler {
// 	@Get()
// 	public async get() {
// 		return await prisma.$isHealthy()
// 	}
// }

// export default createHandler(ApiTemplateEndpointHandler)

import { prisma } from '@/services/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method === 'GET') {
		const result = await prisma.$isHealthy()

		return res.json(result)
		// Process a POST request
	}
}
