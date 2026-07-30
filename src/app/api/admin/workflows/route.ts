import { UserRole } from "@gdhub-io/gdhub-prisma";
import { json, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({
	mode: "user",
	roles: [UserRole.Admin],
})(async () => {
	const workflows = await prisma.workflowSchema.findMany();
	return json(workflows);
});
