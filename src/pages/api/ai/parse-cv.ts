import { IsString } from 'class-validator'
import { Post, Body, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class ParamSlugDto {
	@IsString()
	id?: string
}

// @NextAuthGuard('api')
class ApiAIParseCVHandler {
	constructor() {}

	@Post()
	public async parseCv(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) { id }: ParamSlugDto) {
		// if (!id) throw Error('No id')
		// const lecture = await prisma.lecture.findFirst({
		// 	where: { id },
		// })
		// if (!lecture) {
		// 	throw new Error('Not found the lecture data')
		// }
		// return lecture
	}
}

export default createHandler(ApiAIParseCVHandler)
