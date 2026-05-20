import { revalidatePath } from "next/cache";
import { z } from "zod";
import { json, withAuth, withValidation } from "@/lib/api-handlers";

const RevalidateSchema = z.object({
	slug: z.string(),
});

type RevalidateBody = z.infer<typeof RevalidateSchema>;

export const POST = withAuth({ mode: "user" })(
	withValidation(RevalidateSchema)(async (_req, _ctx, { body }) => {
		const { slug } = body as RevalidateBody;
		revalidatePath(slug);
		return json({ revalidated: true });
	}),
);
