import { Type } from 'class-transformer'
import { IsString } from 'class-validator'

export class ProfileDto {
	id?: string
	userId?: string
	name?: string
	tgNickname?: string | null
	portfolioLink?: string | null
	country?: string | null
	city?: string | null
	createdAt?: Date
	updatedAt?: Date
	timeForWork?: number[]
	preferredGenres?: string[]
	preferredLevels?: string[]
	preferredSettings?: string[]
}

export class UpdateProfileDto {
	@IsString()
	id: string

	@Type(() => ProfileDto)
	data: ProfileDto
}
