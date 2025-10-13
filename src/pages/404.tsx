import { NextSeo } from "next-seo";
import { Error404 } from "@/components/Error404";
import { EmptyLayout } from "@/layouts/EmptyLayout";

export default function Custom404() {
	return (
		<EmptyLayout>
			<NextSeo title="Error 404" nofollow noindex />
			<Error404 theme="dark" />
		</EmptyLayout>
	);
}
