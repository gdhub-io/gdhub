import pdf from "pdf-parse/lib/pdf-parse.js";
import { CV_MAX_BYTES } from "@/config/uploads";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { limitAiCalls } from "@/lib/rate-limit";
import { openAI } from "@/services/openai";

export const maxDuration = 300;

export const POST = withAuth({ mode: "user" })(async (req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	// Refused before buffering; the slack covers the multipart framing around the file.
	const declared = Number(req.headers.get("content-length") ?? 0);
	if (declared > CV_MAX_BYTES * 1.1)
		return apiError.badRequest("File too large");

	const limited = await limitAiCalls("parse-cv", currentUser.id);
	if (limited) return limited;

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
	if (file.size > CV_MAX_BYTES) return apiError.badRequest("File too large");
	// pdf-parse reads nothing else; the magic bytes are checked below, the type is the client's word.
	if (file.type && file.type !== "application/pdf") {
		return apiError.badRequest("Only PDF files are accepted");
	}

	const jobPosition = formData.get("jobPosition");
	const locale = formData.get("locale");

	try {
		const buffer = Buffer.from(await file.arrayBuffer());
		if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
			return apiError.badRequest("Only PDF files are accepted");
		}
		const data = await pdf(buffer);

		if (!data) return apiError.badRequest();

		const response = await openAI.parseCV(
			data.text,
			typeof jobPosition === "string" ? jobPosition : "",
			typeof locale === "string" ? { locale } : undefined,
		);

		return json(response);
	} catch (error) {
		console.error("uploadCV", error);
		return apiError.internal();
	}
});
