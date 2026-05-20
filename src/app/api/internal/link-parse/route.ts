import og from "open-graph-scraper";
import { z } from "zod";
import { json, withAuth, withValidation } from "@/lib/api-handlers";

const LinkParseQuerySchema = z.object({
	url: z.string().url(),
});

type LinkParseQuery = z.infer<typeof LinkParseQuerySchema>;

export const GET = withAuth({ mode: "any" })(
	withValidation(
		LinkParseQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const query = body as LinkParseQuery;
		const { result, error } = await og({ url: query.url });

		return json({
			success: !error,
			meta: {
				title: result?.ogTitle,
				description: result?.ogDescription,
				image: {
					url: result?.ogImage?.[0]?.url,
				},
			},
		});
	}),
);
