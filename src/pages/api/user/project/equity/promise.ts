import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsNotEmpty, IsString } from 'class-validator'
import { Get, Query, Req, createHandler } from 'next-api-decorators'

class GetMemberPromiseDto {
	@IsString()
	@IsNotEmpty()
	promiseId: string
}

@NextAuthGuard('user')
class ApiMemberPromiseHandler {
	@Get()
	public async getMemberPromise(@Req() req: NextApiRequestWithUser, @Query() { promiseId }: GetMemberPromiseDto) {
		const promise = await prisma.equityPromise.findUnique({
			where: { id: promiseId },
		})

		if (!promise) {
			throw new Error('Promise not found')
		}

		return promise
	}
}

export default createHandler(ApiMemberPromiseHandler)
