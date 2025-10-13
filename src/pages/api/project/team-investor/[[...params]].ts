import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import {
	IsDateString,
	IsEnum,
	IsNumber,
	IsOptional,
	IsString,
} from "class-validator";
import {
	Body,
	createHandler,
	Delete,
	Get,
	Param,
	Post,
	Put,
	ValidationPipe,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class TeamInvestorCreateDto {
	@IsString()
	name: string;

	@IsOptional()
	@IsString()
	comment?: string;

	@IsOptional()
	@IsString()
	userId?: string;

	@IsString()
	teamId: string;

	@IsNumber()
	share: number;

	@IsOptional()
	@IsEnum(prismaClient.$Enums.Currency)
	currency?: prismaClient.$Enums.Currency;

	@IsNumber()
	value: number;

	@IsOptional()
	@IsDateString()
	purchasedAt?: string;
}

class TeamInvestorUpdateDto {
	@IsOptional()
	@IsString()
	name?: string;

	@IsOptional()
	@IsString()
	comment?: string;

	@IsOptional()
	@IsString()
	userId?: string;

	@IsOptional()
	@IsString()
	teamId?: string;

	@IsOptional()
	@IsNumber()
	share?: number;

	@IsOptional()
	@IsEnum(prismaClient.$Enums.Currency)
	currency?: prismaClient.$Enums.Currency;

	@IsOptional()
	@IsNumber()
	value?: number;

	@IsOptional()
	@IsDateString()
	purchasedAt?: string;
}

@NextAuthGuard("user")
class ApiTeamInvestorHandler {
	@Get("/:id")
	public async get(@Param("id") id: string) {
		return await prisma.teamInvestor.findUnique({
			where: { id },
			include: {
				user: true,
				team: true,
			},
		});
	}

	@Post()
	public async create(@Body(ValidationPipe) data: TeamInvestorCreateDto) {
		return await prisma.teamInvestor.create({
			data: {
				...data,
				currency: data.currency || prismaClient.$Enums.Currency.USD, //set default currency to USD
				purchasedAt: data.purchasedAt ? new Date(data.purchasedAt) : undefined,
			},
		});
	}

	@Put("/:id")
	public async update(
		@Param("id") id: string,
		@Body(ValidationPipe) data: TeamInvestorUpdateDto,
	) {
		return await prisma.teamInvestor.update({
			where: { id },
			data: {
				...data,
				currency: data.currency || prismaClient.$Enums.Currency.USD, //set default currency to USD
				purchasedAt: data.purchasedAt ? new Date(data.purchasedAt) : undefined,
			},
		});
	}

	@Delete("/:id")
	public async delete(@Param("id") id: string) {
		return await prisma.teamInvestor.delete({ where: { id } });
	}
}

export default createHandler(ApiTeamInvestorHandler);
