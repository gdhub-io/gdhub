import { SearchEngineService } from "@gdhub-io/gdhub-typesense";
import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { drop } from "@/services/typesense/commands/drop";
import { migrate } from "@/services/typesense/commands/migrate";
import { search } from "@/services/typesense/commands/search";

const TypesenseTaskQuerySchema = z.object({
	task: z.enum(["health", "migrate", "specialists", "drop", "search"]),
	query: z.string().optional(),
});

type TypesenseTaskQuery = z.infer<typeof TypesenseTaskQuerySchema>;

// Runs with the admin key, so only a backend caller holding BACKEND_KEY may reach it.
export const GET = pipe(
	withAuth({ mode: "api" }),
	withValidation(TypesenseTaskQuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { task, query } = body as TypesenseTaskQuery;

	const searchClient = await SearchEngineService.init({
		host: process.env.NEXT_PUBLIC_TYPESENSE_HOST as string,
		port: Number.parseInt(process.env.NEXT_PUBLIC_TYPESENSE_PORT as string),
		protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL as string,
		apiKey: process.env.TYPESENSE_ADMIN_API as string,
	});

	switch (task) {
		case "health": {
			const health = await searchClient.client.health.retrieve();
			return json(health);
		}
		case "migrate":
			await migrate(searchClient);
			return json({ success: true });
		case "specialists": {
			const docs = await searchClient.client
				.collections(
					process.env.NEXT_PUBLIC_TYPESENSE_SPECIALISTS_SCHEMA as string,
				)
				.documents()
				.export();
			return json(docs);
		}
		case "drop":
			await drop(searchClient);
			return json({ success: true });
		case "search": {
			const result = await search(searchClient, {
				q: query ?? "",
				query_by: "name,direction,schools",
			});
			return json(result);
		}
		default:
			return apiError.badRequest("Unknown task");
	}
});
