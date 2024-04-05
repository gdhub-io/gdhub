import { AvailableLocales } from '@/config/locale'
import { PrimaryInterest } from '@prisma/client'
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreateProfileDto {
	@IsString()
	@IsOptional()
	name: string

	@IsNumber()
	yearOfBirth: number

	@IsString()
	@IsOptional()
	tgNickname?: string | null

	@IsString()
	@IsOptional()
	portfolioLink?: string | null

	@IsString()
	@IsOptional()
	country: string

	@IsString()
	@IsOptional()
	city?: string | null

	@IsNumber({}, { each: true })
	@IsOptional()
	timeForWork?: number[]

	@IsString({ each: true })
	@IsOptional()
	preferredGenres?: string[]

	@IsString({ each: true })
	@IsOptional()
	preferredLevels?: string[]

	@IsString({ each: true })
	@IsOptional()
	preferredSettings?: string[]

	@IsBoolean()
	@IsOptional()
	confirmUserData?: boolean

	@IsBoolean()
	@IsOptional()
	onboardingDone?: boolean
}

export class UpdateProfileDto {
	@IsString()
	@IsOptional()
	name?: string

	@IsString()
	@IsOptional()
	tgNickname?: string | null

	@IsString()
	@IsOptional()
	portfolioLink?: string | null

	@IsString()
	@IsOptional()
	country?: string | null

	@IsString()
	@IsOptional()
	city?: string | null

	@IsString()
	@IsOptional()
	createdAt?: Date

	@IsString()
	@IsOptional()
	updatedAt?: Date

	@IsNumber({}, { each: true })
	@IsOptional()
	timeForWork?: number[]

	@IsString()
	@IsOptional()
	otherResources: string

	@IsBoolean()
	@IsOptional()
	isActive: boolean

	@IsEnum(PrimaryInterest)
	@IsOptional()
	primaryInterest: PrimaryInterest

	@IsString({ each: true })
	@IsOptional()
	preferredGenres?: string[]

	@IsString({ each: true })
	@IsOptional()
	preferredLevels?: string[]

	@IsString({ each: true })
	@IsOptional()
	preferredSettings?: string[]

	@IsBoolean()
	@IsOptional()
	agreeWithTermsAndPrivacy: boolean

	@IsBoolean()
	@IsOptional()
	needSubscribeToNewsletter: boolean

	@IsBoolean()
	@IsOptional()
	confirmUserData?: boolean

	@IsBoolean()
	@IsOptional()
	onboardingDone?: boolean

	@IsEnum(AvailableLocales)
	@IsOptional()
	lang?: AvailableLocales
}
