import { json } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export async function GET() {
	const items = await prisma.gameSetting.findMany();
	return json(items);
}
