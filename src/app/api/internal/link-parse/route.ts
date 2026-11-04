import og from "open-graph-scraper";
import { z } from "zod";
import { json, withAuth, withValidation } from "@/lib/api-handlers";
import { fetchBody } from "@/services/artifact-check/safe-fetch";

const LinkParseQuerySchema = z.object({
	url: z.string().url(),
});

type LinkParseQuery = z.infer<typeof LinkParseQuerySchema>;

const MAX_PAGE_BYTES = 2 * 1024 * 1024;

const failed = () => json({ success: false, meta: {} });

// The page is fetched through safe-fetch, so a link to a private address is never opened.
export const GET = withAuth({ mode: "user" })(
	withValidation(
		LinkParseQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const query = body as LinkParseQuery;
		const page = await fetchBody(
			query.url,
			MAX_PAGE_BYTES,
			(type) => type === "text/html" || type === "application/xhtml+xml",
		);
		if (!page.ok) return failed();

		const html = new TextDecoder().decode(page.body.bytes);
		const { result, error } = await og({ html }).catch(() => ({
			result: undefined,
			error: true,
		}));
		if (error || !result) return failed();

		const image = URL.parse(result.ogImage?.[0]?.url ?? "", page.body.url);
		return json({
			success: true,
			meta: {
				title: result.ogTitle,
				description: result.ogDescription,
				image: {
					url: image?.toString(),
				},
			},
		});
	}),
);
