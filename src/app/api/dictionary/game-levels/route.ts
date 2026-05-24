import { json } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export async function GET() {
	const items = await prisma.gameDifficultyLevel.findMany();
	return json(items);
}
