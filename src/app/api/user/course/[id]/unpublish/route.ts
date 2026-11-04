import { CourseStatus } from "@gdhub-io/gdhub-prisma";
import { json, pipe, withAuth } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import type { SpaceAccess } from "@/services/access";
import { prisma } from "@/services/prisma";

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "course.lifecycle.publish",
		idFrom: "params.id",
	}),
)(async (_req, _ctx, { access }) => {
	await prisma.course.update({
		where: { id: (access as SpaceAccess).id },
		data: {
			status: CourseStatus.Draft,
			publishedAt: null,
		},
	});

	return json({ success: true });
});
