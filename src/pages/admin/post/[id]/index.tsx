import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { AdminLayout } from "@/layouts/AdminLayout";
import type { NextPageWithLayout } from "@/pages/_app";

const BlogPostEditor = dynamic(
	() => import("@/components/admin/BlogPostEditor").then((mod) => mod.default),
	{
		ssr: false,
	},
);

const BlogPostEditorAdminPage: NextPageWithLayout = () => {
	const router = useRouter();
	const { id: postId } = router.query as { id: string };

	return <BlogPostEditor id={postId} />;
};

BlogPostEditorAdminPage.getLayout = (page) => <AdminLayout>{page}</AdminLayout>;

export default BlogPostEditorAdminPage;
