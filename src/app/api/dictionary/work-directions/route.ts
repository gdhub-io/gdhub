import { json, sharedCache } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export async function GET() {
	const items = await prisma.workDirection.findMany({
		orderBy: { name: "asc" },
	});
	return json(items, sharedCache(3600));
}
