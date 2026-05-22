"use client";

import { Layout } from "antd";
import type { ReactNode } from "react";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { SettingsSider } from "./SettingsSider";
import styles from "./style.module.scss";

export default function SettingsLayout({ children }: { children: ReactNode }) {
	return (
		<>
			<ProtectedPageHeader title="Settings" />
			<div className="layout-background">
				<Layout>
					<SettingsSider />
					<Layout.Content className={styles.content}>{children}</Layout.Content>
				</Layout>
			</div>
		</>
	);
}
