"use client";

import { Render } from "@9gustin/react-notion-render";
import { PublicLayout } from "@/layouts/PublicLayout";
import styles from "@/styles/cookie-policy.module.scss";
import "@9gustin/react-notion-render/dist/index.css";

export function PrivacyPolicyClient({ blocks }: { blocks: any }) {
	return (
		<PublicLayout title="Privacy Policy">
			<div className={styles.container}>
				<Render blocks={blocks.results} simpleTitles />
			</div>
		</PublicLayout>
	);
}
