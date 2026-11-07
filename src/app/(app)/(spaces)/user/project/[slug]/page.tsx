import { redirect } from "next/navigation";
import { projectSpaceHref } from "@/helpers/project-space";

/** The space opens on its workflow until the project gets an overview of its own. */
export default async function MyProjectHomePage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;

	redirect(projectSpaceHref(slug));
}
