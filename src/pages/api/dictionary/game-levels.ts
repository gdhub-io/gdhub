import { createHandler, Get } from "next-api-decorators";
import { prisma } from "@/services/prisma";

class ApiDictGameLevelsHandler {
	constructor() {}

	@Get()
	public async get() {
		return await prisma.gameDifficultyLevel.findMany();
	}
}

export default createHandler(ApiDictGameLevelsHandler);
