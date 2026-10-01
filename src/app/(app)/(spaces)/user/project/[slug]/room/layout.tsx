import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { createPermissionGate } from "@/lib/space-gate";
import { projectHasRoom } from "@/repositories/checkpoint.repository";

const PermissionGate = createPermissionGate("project.room.use", {
	param: "slug",
});

export default async function ProjectRoomLayout({
	children,
	params,
}: {
	children: ReactNode;
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;

	if (!(await projectHasRoom(slug))) notFound();

	return <PermissionGate params={params}>{children}</PermissionGate>;
}
