import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHandler, Get } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";

@NextAuthGuard("user")
class ApiLegalCoDevelopmentAgreementHandler {
	@Get()
	public async get() {
		try {
			const agreementPath = path.join(
				process.cwd(),
				"docs",
				"co-development-agreement.md",
			);
			const markdown = await readFile(agreementPath, "utf8");

			return { markdown };
		} catch (error) {
			console.error("[legal.co-development-agreement]", error);
			throw new Error("Failed to load co-development agreement");
		}
	}
}

export default createHandler(ApiLegalCoDevelopmentAgreementHandler);
