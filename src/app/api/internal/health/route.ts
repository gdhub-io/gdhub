import { SearchEngineService } from "@gdhub-io/gdhub-typesense";
import type { NextRequest } from "next/server";
import { isBackendCall, json } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";
import SanityService from "@/services/sanity";
import TelegramService from "@/services/telegram";

// Uptime checks get a bare ok; the per-provider breakdown, which also calls every provider, needs BACKEND_KEY.
export async function GET(req: NextRequest) {
	if (!isBackendCall(req)) return json({ ok: true });

	const telegramService = TelegramService.init();
	const sanityService = SanityService;

	const dbResult = await prisma.$isHealthy();
	const httpResult = await fetch(process.env.NEXTAUTH_URL || "");
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
	const telegramResult = await telegramService.health();
	const sanityResult = await sanityService.health();

	const total =
		dbResult &&
		httpResult.ok &&
		tolgeeResult.ok &&
		typesenseResult.ok &&
		telegramResult.ok &&
		sanityResult.ok;

	return json({
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
	});
}
