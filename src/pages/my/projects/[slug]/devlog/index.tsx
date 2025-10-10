import { useRouter } from "next/navigation";
import { DevLogWall } from "@/components/DevLogWall";
import { ProtectedProjectLayout } from "@/layouts/ProtectedProjectLayout";
import type { NextPageWithLayout } from "@/pages/_app";

const MyProjectPage: NextPageWithLayout = () => {
	const router = useRouter();
	const projectSlug = router.query.slug as string;

	return (
		<ProtectedProjectLayout>
			<DevLogWall slug={projectSlug} />
		</ProtectedProjectLayout>
	);
};

export default MyProjectPage;
