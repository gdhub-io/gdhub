import { SearchEngineService } from "@gdhub-io/gdhub-typesense";
import type { NextApiRequest, NextApiResponse } from "next";
import { createHandler, Get } from "next-api-decorators";
import { prisma } from "@/services/prisma";
import SanityService from "@/services/sanity";
import TelegramService from "@/services/telegram";

class ApiHealthyHandler {
	constructor(
		private readonly telegramService = TelegramService.init(),
		private readonly sanityService = SanityService,
	) {}

	@Get()
	async handler(req: NextApiRequest, res: NextApiResponse) {
		// check if database is healthy
		const dbResult = await prisma.$isHealthy();

		// check if http request is healthy
		const httpResult = await fetch(process.env.NEXTAUTH_URL || "");

		// check if novu is healthy
		const tolgeeResult = await fetch(
			process.env.NEXT_PUBLIC_TOLGEE_API_URL || "",
		);

		const typesenseService = await SearchEngineService.init({
			host: process.env.NEXT_PUBLIC_TYPESENSE_HOST as string,
			port: Number.parseInt(process.env.NEXT_PUBLIC_TYPESENSE_PORT as string),
			protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL as string,
			apiKey: process.env.TYPESENSE_ADMIN_API as string,
		});

		const typesenseResult = await typesenseService.client.health.retrieve();

		const telegramResult = await this.telegramService.health();
		const sanityResult = await this.sanityService.health();

		const total =
			dbResult &&
			httpResult.ok &&
			tolgeeResult.ok &&
			typesenseResult.ok &&
			telegramResult.ok &&
			sanityResult.ok;

		return {
			healthy: total,
			services: {
				"server[http]": httpResult.ok,
				"db[postgres]": dbResult,
				"translate[tolgee]": tolgeeResult.ok,
				"search[typesense]": typesenseResult.ok,
				"chat[telegram]": telegramResult.ok,
				"images[sanity]": sanityResult.ok,
				"queue[redis]": "",
				"notifications[novu]": "",
				"ai[openai]": "",
				"email[brevo]": "",
			},
		};
	}
}

export default createHandler(ApiHealthyHandler);
