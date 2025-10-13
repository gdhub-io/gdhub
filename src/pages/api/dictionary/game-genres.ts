import { createHandler, Get } from "next-api-decorators";
import { prisma } from "@/services/prisma";

class ApiDictGameGenresHandler {
	constructor() {}

	@Get()
	public async get() {
		return await prisma.gameGenre.findMany();
	}
}

export default createHandler(ApiDictGameGenresHandler);
