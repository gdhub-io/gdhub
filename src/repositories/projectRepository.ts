import { PrismaService } from '@/services/prisma'
import PrismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { BadRequestException } from 'next-api-decorators'
import { BaseRepository } from './baseRepository'

// Использование для конкретной сущности
// class UserRepository extends BaseRepository<User> {
// 	constructor() {
// 		super(prisma.user)
// 	}

// 	async findByEmail(email: string): Promise<User | null> {
// 		return prisma.user.findUnique({ where: { email } })
// 	}
// }

export class ProjectRepository extends BaseRepository<PrismaClient.Project> {
	constructor(private readonly prisma = PrismaService.init()) {
		super(prisma.user)
	}

	// async create(args: PrismaClient.Prisma.ProjectCreateArgs) {
	// 	const project = await this.prisma.project.create(args)

	// 	const workflow = await this.prisma.workflowSchema.findFirst({
	// 		where: { name: { equals: 'default', mode: 'insensitive' } },
	// 	})

	// 	if (!workflow) throw new BadRequestException('Default workflow not found')

	// 	this.prisma.projectWorkflow.create({
	// 		data: {
	// 			projectId: project.id,
	// 			workflowSchemaId: workflow.id,
	// 		},
	// 	})

	// 	return project
	// }
}
