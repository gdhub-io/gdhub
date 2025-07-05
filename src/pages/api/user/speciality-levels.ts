import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { Transform } from 'class-transformer'
import { IsArray, IsEnum, IsOptional } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class GetSpecialityLevelsDto {
	@IsArray()
	@IsEnum(prismaClient.$Enums.SkillLevel, { each: true })
	@IsOptional()
	@Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : undefined))
	level?: prismaClient.$Enums.SkillLevel[]
}

@NextAuthGuard('user')
class ApiSpecialityHandler {
	constructor() {}

	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { level }: GetSpecialityLevelsDto) {
		console.log('req.query:', req.query)
		console.log(level)

		const specialities = await prisma.speciality.findMany({
			where: { userId: req.user.id, level: level ? { in: level } : undefined },
			select: { level: true },
		})

		const levels = specialities.map((speciality: { level: prismaClient.$Enums.SkillLevel }) => speciality.level)
		const uniqueLevels = [...new Set(levels)]

		return uniqueLevels
	}
}

export default createHandler(ApiSpecialityHandler)
