import { createHandler, Get } from "next-api-decorators";
import { prisma } from "@/services/prisma";

class ApiDictWorkDirectionsHandler {
	constructor() {}

	@Get()
	public async get() {
		return await prisma.workDirection.findMany();
	}
}

export default createHandler(ApiDictWorkDirectionsHandler);
