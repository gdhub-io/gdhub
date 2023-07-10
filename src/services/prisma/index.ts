import { PrismaClient, User } from '@prisma/client'

export class PrismaService {
	private static instance: PrismaService
	public client: PrismaClient

	private constructor() {
		this.client = new PrismaClient()
	}

	public static getInstance(): PrismaService {
		if (!PrismaService.instance) {
			PrismaService.instance = new PrismaService()
		}

		return PrismaService.instance
	}
}
