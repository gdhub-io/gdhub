import { IsUrl } from "class-validator";
import { createHandler, Get, Query, ValidationPipe } from "next-api-decorators";
import og from "open-graph-scraper";
import { NextAuthGuard } from "@/lib/api-middlewares";

class LinkParseDto {
	@IsUrl()
	url: string;
}

@NextAuthGuard("any")
class LinkParseHandler {
	@Get()
	public async parse(@Query(ValidationPipe) query: LinkParseDto) {
		const { result, error } = await og(query);

		return {
			success: !error,
			meta: {
				title: result?.ogTitle,
				description: result?.ogDescription,
				image: {
					url: result?.ogImage?.[0]?.url,
				},
			},
		};
	}
}

export default createHandler(LinkParseHandler);
