import { z } from "zod";
import { ContentViewSubject } from "@/config/prisma-enums";
import {
	CONTENT_VIEW_BATCH_MAX,
	CONTENT_VIEW_SOURCES,
} from "@/types/content-views";

/** A flush of the client's view buffer. */
export const ContentViewsSchema = z.object({
	subject: z.nativeEnum(ContentViewSubject),
	ids: z.array(z.string().min(1).max(64)).min(1).max(CONTENT_VIEW_BATCH_MAX),
	source: z.enum(CONTENT_VIEW_SOURCES),
});

export type ContentViewsInput = z.infer<typeof ContentViewsSchema>;
