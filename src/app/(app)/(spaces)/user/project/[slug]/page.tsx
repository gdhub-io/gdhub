import { redirect } from "next/navigation";

/** The space opens on its workflow until the project gets an overview of its own. */
export default async function MyProjectHomePage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;

	redirect(`/user/project/${slug}/workflow`);
}
