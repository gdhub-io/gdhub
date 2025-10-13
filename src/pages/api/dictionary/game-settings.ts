import { createHandler, Get } from "next-api-decorators";
import { prisma } from "@/services/prisma";

class ApiDictGameSettingsHandler {
	constructor() {}

	@Get()
	public async get() {
		return await prisma.gameSetting.findMany();
	}
}

export default createHandler(ApiDictGameSettingsHandler);
