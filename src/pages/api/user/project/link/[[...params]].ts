import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { Type, instanceToPlain } from 'class-transformer'
import { IsArray, IsBoolean, IsNotEmpty, IsString } from 'class-validator'
import { Body, createHandler, Put, Req, ValidationPipe } from 'next-api-decorators'

class ProjectLinkDto {
	@IsString()
	platform: string

	@IsString()
	link: string

	@IsBoolean()
	isPrimary: boolean
}

class UserProjectLinksDto {
	@IsString()
	id: string

	@IsArray()
	@IsNotEmpty()
	@Type(() => ProjectLinkDto)
	links: ProjectLinkDto[]
}

@NextAuthGuard('user')
class ApiUserProjectLinkHandler {
	@Put()
	public async save(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) { id, links }: UserProjectLinksDto) {
		const data = await prisma.project.update({
			where: { id },
			data: { links: instanceToPlain(links) },
		})

		// Return the updated links in the expected format
		const updatedLinks = (data.links as any[]) || []
		return updatedLinks.map((link: any) => ({
			platform: link.platform || '',
			link: link.link || '',
			isPrimary: link.isPrimary || false,
		}))
	}
}

export default createHandler(ApiUserProjectLinkHandler)
