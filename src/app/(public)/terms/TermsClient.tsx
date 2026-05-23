"use client";

import { Render } from "@9gustin/react-notion-render";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";
import styles from "@/styles/cookie-policy.module.scss";
import "@9gustin/react-notion-render/dist/index.css";

export function TermsClient({ blocks }: { blocks: any }) {
	return (
		<>
			<PublicPageHeader title="Terms of Use" />
			<div className="layout-background">
				<div className={styles.container}>
					<Render blocks={blocks.results} simpleTitles />
				</div>
			</div>
		</>
	);
}
