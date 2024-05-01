import { SkillLevel } from '@prisma/client'
import { Type } from 'class-transformer'
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator'

export class WorkDirectionDto {
	@IsString()
	id?: string
	@IsString()
	name: string
}

export class SpecialityDto {
	@IsString()
	@IsOptional()
	id?: string

	@IsString()
	@IsOptional()
	name: string

	@IsString()
	@IsOptional()
	specialization: string

	@IsEnum(SkillLevel)
	@IsOptional()
	level: SkillLevel

	@IsString()
	@IsOptional()
	portfolioUrl?: string

	@IsString()
	@IsOptional()
	workDirectionId: string

	@IsString()
	@IsOptional()
	userId: string

	@IsString()
	@IsString({ each: true })
	@IsOptional()
	skills?: string

	@IsOptional()
	tools?: string

	@IsString()
	@IsOptional()
	jobs?: string

	@IsString()
	@IsOptional()
	schools?: string
}

export class CreateSpecialityDto {
	@Type(() => SpecialityDto)
	@ValidateNested()
	@IsNotEmpty()
	data: SpecialityDto
}

export class UpdateSpecialityDto {
	@IsString()
	id: string

	@Type(() => SpecialityDto)
	data: SpecialityDto
}

export class DeleteSpecialityDto {
	@IsString()
	id: string
}
