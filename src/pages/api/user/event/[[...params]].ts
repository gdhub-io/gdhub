import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { Type, Transform } from 'class-transformer'
import { IsArray, IsBoolean, IsDate, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator'
import { Body, Delete, Get, Param, Post, Put, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class IDParamDto {
	@IsString()
	id: string
}

class UserEventScheduleItemDto {
	@IsString()
	@IsOptional()
	id?: string

	@IsString()
	@IsOptional()
	title?: string

	@IsString()
	@IsOptional()
	description?: string

	@IsString()
	@IsOptional()
	url?: string

	@IsDate()
	@IsOptional()
	startDate?: Date

	@IsDate()
	@IsOptional()
	endDate?: Date

	@IsArray()
	@IsString({ each: true })
	@Transform(({ value }) => (Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v : v?.id)) : value))
	speakers: string[]

	@IsString()
	directionId: string
}

class UserEventCreateDto {
	@IsString()
	title: string

	@IsString()
	@IsOptional()
	shortDescription?: string

	@IsString()
	description: string

	@IsString()
	@IsOptional()
	url?: string

	@IsString()
	@IsOptional()
	image?: string

	@IsString()
	@IsEnum(prismaClient.EventType)
	type: prismaClient.EventType

	@IsString()
	format: prismaClient.$Enums.EventFormat

	@IsBoolean()
	@IsOptional()
	isFree?: boolean

	@IsArray()
	@ValidateNested({ each: true })
	@IsOptional()
	@Type(() => UserEventScheduleItemDto)
	schedule?: UserEventScheduleItemDto[]
}

class UserEventUpdateDto {
	@IsString()
	title: string

	@IsString()
	description: string

	@IsString()
	@IsOptional()
	shortDescription?: string

	@IsString()
	@IsOptional()
	url?: string

	@IsString()
	@IsOptional()
	image?: string

	@IsString()
	format: prismaClient.$Enums.EventFormat

	@IsBoolean()
	@IsOptional()
	isFree?: boolean

	@IsArray()
	@IsOptional()
	@ValidateNested({ each: true })
	@Type(() => UserEventScheduleItemDto)
	schedule?: UserEventScheduleItemDto[]
}

@NextAuthGuard('user')
class ApiUserEventEndpointHandler {
	@Get('/:id')
	public async get(@Req() req: NextApiRequestWithUser, @Param('id') id: string) {
		const isAdmin = req.user.role === prismaClient.UserRole.Admin

		return await prisma.event.findUnique({
			where: {
				id,
				createdById: isAdmin ? undefined : req.user.id,
			},
			include: {
				schedule: {
					include: {
						speakers: {
							select: {
								id: true,
								name: true,
								user: {
									select: {
										image: true,
										profile: {
											select: {
												name: true,
											},
										},
									},
								},
							},
						},
					},
				},
			},
		})
	}

	@Get('/count')
	public async count(@Req() req: NextApiRequestWithUser) {
		return await prisma.event.count({
			where: {
				createdById: req.user.id,
			},
		})
	}

	@Post()
	public async create(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) data: UserEventCreateDto) {
		const event = await prisma.event.create({
			data: {
				type: data.type,
				title: data.title,
				shortDescription: data.shortDescription,
				description: data.description,
				url: data.url,
				image: data.image,
				format: data.format,
				createdById: req.user.id,
			},
		})

		for (const item of data.schedule ?? []) {
			await prisma.eventScheduleItem.create({
				data: {
					eventId: event.id,
					title: item.title,
					description: item.description,
					url: item.url,
					directionId: item.directionId,
					startDate: item.startDate?.toISOString() ?? new Date().toISOString(),
					endDate: item.endDate?.toISOString() ?? new Date().toISOString(),
					speakers: {
						connect: item.speakers.map((speaker) => ({
							id: speaker,
						})),
					},
				},
			})
		}

		return event
	}

	@Put('/:id')
	public async update(@Param('id') id: string, @Body(ValidationPipe) data: UserEventUpdateDto) {
		console.log(id, data)
		const event = await prisma.event.update({
			where: {
				id,
			},
			data: {
				title: data.title,
				shortDescription: data.shortDescription,
				description: data.description,
				url: data.url,
				image: data.image,
				format: data.format,
				isFree: data.isFree,
			},
		})

		for (const item of data.schedule ?? []) {
			if (item.id) {
				await prisma.eventScheduleItem.update({
					where: { id: item.id },
					data: {
						title: item.title,
						description: item.description,
						directionId: item.directionId,
						url: item.url,
						startDate: item.startDate?.toISOString() ?? new Date().toISOString(),
						endDate: item.endDate?.toISOString() ?? new Date().toISOString(),
					},
				})
			} else {
				await prisma.eventScheduleItem.create({
					data: {
						eventId: event.id,
						title: item.title,
						description: item.description,
						url: item.url,
						directionId: item.directionId,
						startDate: item.startDate?.toISOString() ?? new Date().toISOString(),
						endDate: item.endDate?.toISOString() ?? new Date().toISOString(),
						speakers: {
							connect: item.speakers.map((speaker) => ({
								id: speaker,
							})),
						},
					},
				})
			}
		}

		return event
	}

	@Delete()
	public async delete(@Query(ValidationPipe) { id }: IDParamDto) {
		await prisma.event.delete({
			where: {
				id,
			},
		})

		return { success: true }
	}
}

export default createHandler(ApiUserEventEndpointHandler)
