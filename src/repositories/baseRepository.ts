export class BaseRepository<T> {
	constructor(private model: any) {}

	async findById(id: string): Promise<T | null> {
		return this.model.findUnique({ where: { id } })
	}

	async findAll(): Promise<T[]> {
		return this.model.findMany()
	}

	async create(data: Partial<T>): Promise<T> {
		return this.model.create({ data })
	}

	async update(id: string, data: Partial<T>): Promise<T> {
		return this.model.update({ where: { id }, data })
	}

	async delete(id: string): Promise<T> {
		return this.model.delete({ where: { id } })
	}
}
