import { createHmac } from "crypto";
import { json, withAuth } from "@/lib/api-handlers";

export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const signature = createHmac("sha256", process.env.NOVU_API_SECRET as string)
		.update(user.id as string)
		.digest("hex");

	return json({ signature });
});
