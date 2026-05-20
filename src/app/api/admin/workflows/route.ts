import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { json, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({
	mode: "user",
	roles: [prismaClient.UserRole.Admin],
})(async () => {
	const workflows = await prisma.workflowSchema.findMany();
	return json(workflows);
});
