"use client";

import { Layout } from "antd";
import type { ReactNode } from "react";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { SettingsSider } from "./SettingsSider";
import styles from "./style.module.scss";

export default function SettingsLayout({ children }: { children: ReactNode }) {
	return (
		<>
			{/* Inside `layout-background`, like every other page: outside it the
			    header misses the content gutter and max-width and drifts left. */}
			<div className="layout-background">
				<ProtectedPageHeader title="Settings" />
				<Layout>
					<SettingsSider />
					<Layout.Content className={styles.content}>{children}</Layout.Content>
				</Layout>
			</div>
		</>
	);
}
