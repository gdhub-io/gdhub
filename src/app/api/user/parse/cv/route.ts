import pdf from "pdf-parse";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { openAI } from "@/services/openai";

export const maxDuration = 300;

export const POST = withAuth({ mode: "user" })(async (req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	let formData: FormData;
	try {
		formData = await req.formData();
	} catch {
		return apiError.badRequest("Invalid multipart form data");
	}

	const file = formData.get("file");
	if (!(file instanceof File)) {
		return apiError.badRequest("file is required");
	}

	const jobPosition = formData.get("jobPosition");
	const locale = formData.get("locale");

	try {
		const buffer = Buffer.from(await file.arrayBuffer());
		const data = await pdf(buffer);

		if (!data) return apiError.badRequest();

		const response = await openAI.parseCV(
			data.text,
			typeof jobPosition === "string" ? jobPosition : "",
			typeof locale === "string" ? { locale } : undefined,
		);

		return json(response);
	} catch (error: any) {
		console.error("uploadCV", error);
		const message = error?.error?.message ?? error?.message ?? "Internal error";
		return apiError.internal(message);
	}
});
