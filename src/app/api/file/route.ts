import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/helpers/env";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import SanityService from "@/services/sanity";

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

	const filename = formData.get("filename");

	const maxSizeMb = env("NEXT_PUBLIC_UPLOAD_FILE_FOR_REPORT_MAX_SIZE", 5);
	if (file.size > 1024 * 1024 * maxSizeMb) {
		return NextResponse.json(
			{ error: "Payload too large", statusCode: 413 },
			{ status: 413 },
		);
	}

	const data = Buffer.from(await file.arrayBuffer());

	const response = await SanityService.uploadImage(
		(typeof filename === "string" && filename) || file.name,
		data,
		currentUser.id,
	);

	return json(response);
});

const DeleteFileQuerySchema = z.object({
	fileUrl: z.string().url(),
});

type DeleteFileQuery = z.infer<typeof DeleteFileQuerySchema>;

export const DELETE = withAuth({ mode: "user" })(
	withValidation(
		DeleteFileQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const { fileUrl } = body as DeleteFileQuery;
		await SanityService.removeFile(fileUrl, currentUser.id);

		return json(null);
	}),
);
